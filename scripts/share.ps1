param(
    [ValidateRange(1024, 65535)]
    [int] $Port = 8787
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$originUrl = "http://127.0.0.1:$Port"
$originalLocation = Get-Location
$tunnelOutput = [System.IO.Path]::GetTempFileName()
$tunnelError = [System.IO.Path]::GetTempFileName()
$tunnelProcess = $null

try {
    Set-Location $projectRoot

    foreach ($command in @('php', 'npm', 'npx', 'cloudflared')) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
            throw "O comando '$command' nao foi encontrado no PATH."
        }
    }

    $cloudflaredConfigs = @(
        (Join-Path $env:USERPROFILE '.cloudflared\config.yml'),
        (Join-Path $env:USERPROFILE '.cloudflared\config.yaml')
    ) | Where-Object { Test-Path -LiteralPath $_ }

    if (@($cloudflaredConfigs).Count -gt 0) {
        throw 'O Quick Tunnel nao funciona enquanto existir um config.yml ou config.yaml em .cloudflared.'
    }

    Write-Host 'Preparando o build de producao do Hiratafy...'
    & npm run build

    if ($LASTEXITCODE -ne 0) {
        throw 'O build do frontend falhou.'
    }

    $env:APP_ENV = 'production'
    $env:APP_DEBUG = 'false'
    $env:LOG_LEVEL = 'warning'
    $env:SESSION_SECURE_COOKIE = 'true'
    $env:TRUST_TUNNEL_PROXIES = 'true'
    $env:FORTIFY_PASSKEYS_LOGIN_ENABLED = 'false'

    & php artisan optimize:clear --no-ansi

    if ($LASTEXITCODE -ne 0) {
        throw 'Nao foi possivel limpar os caches do Laravel.'
    }

    & php artisan migrate --force --no-interaction --no-ansi

    if ($LASTEXITCODE -ne 0) {
        throw 'Nao foi possivel atualizar o banco de dados.'
    }

    $cloudflared = (Get-Command cloudflared).Source
    $tunnelOptions = @{
        FilePath = $cloudflared
        ArgumentList = @('tunnel', '--url', $originUrl, '--no-autoupdate', '--loglevel', 'info')
        WindowStyle = 'Hidden'
        RedirectStandardOutput = $tunnelOutput
        RedirectStandardError = $tunnelError
        PassThru = $true
    }
    $tunnelProcess = Start-Process @tunnelOptions

    $publicUrl = $null

    for ($attempt = 0; $attempt -lt 80; $attempt++) {
        if ($tunnelProcess.HasExited) {
            break
        }

        $tunnelLog = @(
            (Get-Content -LiteralPath $tunnelOutput -Raw -ErrorAction SilentlyContinue),
            (Get-Content -LiteralPath $tunnelError -Raw -ErrorAction SilentlyContinue)
        ) -join "`n"
        $urlMatch = [regex]::Match($tunnelLog, 'https://[a-z0-9-]+\.trycloudflare\.com')

        if ($urlMatch.Success) {
            $publicUrl = $urlMatch.Value
            break
        }

        Start-Sleep -Milliseconds 250
    }

    if (-not $publicUrl) {
        $tunnelLog = @(
            (Get-Content -LiteralPath $tunnelOutput -Raw -ErrorAction SilentlyContinue),
            (Get-Content -LiteralPath $tunnelError -Raw -ErrorAction SilentlyContinue)
        ) -join "`n"

        throw "O Cloudflare nao gerou um endereco publico.`n$tunnelLog"
    }

    $env:APP_URL = $publicUrl

    $php = (Get-Command php).Source
    & $php artisan shopify:setup $publicUrl --no-ansi --no-interaction

    if ($LASTEXITCODE -ne 0) {
        Write-Warning 'O app foi iniciado, mas a Shopify nao conseguiu atualizar o webhook.'
    }

    Write-Host ''
    Write-Host 'Hiratafy esta disponivel em:' -ForegroundColor Green
    Write-Host $publicUrl -ForegroundColor Cyan
    Write-Host ''
    Write-Host 'Mantenha este terminal aberto. Pressione Ctrl+C para encerrar.'

    $serverCommand = "`"$php`" artisan serve --host=127.0.0.1 --port=$Port --tries=1 --no-reload --no-ansi --no-interaction"
    $queueCommand = "`"$php`" artisan queue:work --sleep=1 --tries=3 --timeout=120 --no-interaction"
    & npx concurrently `
        --names 'server,queue' `
        --hide 'server,queue' `
        --kill-others `
        --kill-timeout 3000 `
        $serverCommand `
        $queueCommand

    if ($LASTEXITCODE -ne 0) {
        throw 'O servidor local ou a fila do Hiratafy foi encerrado com erro.'
    }
} finally {
    if ($null -ne $tunnelProcess -and -not $tunnelProcess.HasExited) {
        Stop-Process -Id $tunnelProcess.Id -Force -ErrorAction SilentlyContinue
    }

    foreach ($temporaryFile in @($tunnelOutput, $tunnelError)) {
        if (Test-Path -LiteralPath $temporaryFile) {
            Remove-Item -LiteralPath $temporaryFile -Force -ErrorAction SilentlyContinue
        }
    }

    Set-Location $originalLocation
}
