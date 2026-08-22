<?php

test('application shell exposes installable web app metadata', function () {
    $this->get(route('login'))
        ->assertOk()
        ->assertSee('rel="manifest" href="/manifest.webmanifest"', false)
        ->assertSee('name="mobile-web-app-capable" content="yes"', false)
        ->assertSee('name="apple-mobile-web-app-capable" content="yes"', false)
        ->assertSee('name="apple-mobile-web-app-title" content="Hiratafy"', false);
});

test('web app manifest contains the required install metadata and icons', function () {
    $manifest = json_decode(
        file_get_contents(public_path('manifest.webmanifest')),
        true,
        flags: JSON_THROW_ON_ERROR,
    );

    expect($manifest)
        ->toMatchArray([
            'id' => '/',
            'name' => 'Hiratafy',
            'short_name' => 'Hiratafy',
            'start_url' => '/dashboard',
            'scope' => '/',
            'display' => 'standalone',
            'lang' => 'pt-BR',
        ])
        ->and(collect($manifest['icons'])->pluck('sizes')->all())
        ->toContain('192x192', '512x512')
        ->and(collect($manifest['icons'])->pluck('purpose')->all())
        ->toContain('any', 'maskable')
        ->and($manifest['shortcuts'])
        ->toHaveCount(3);

    foreach ([
        'pwa/icon-192.png' => [192, 192],
        'pwa/icon-512.png' => [512, 512],
        'pwa/icon-maskable-512.png' => [512, 512],
    ] as $icon => $expectedSize) {
        expect(public_path($icon))->toBeFile();

        $imageSize = getimagesize(public_path($icon));

        expect([$imageSize[0], $imageSize[1]])->toBe($expectedSize);
    }
});

test('service worker keeps authenticated pages out of its cache', function () {
    $serviceWorker = file_get_contents(public_path('sw.js'));

    expect(public_path('offline.html'))->toBeFile()
        ->and($serviceWorker)
        ->toContain("request.mode === 'navigate'")
        ->toContain("caches.match('/offline.html')")
        ->toContain('caches.match(request)')
        ->toContain("event.data?.type === 'SKIP_WAITING'")
        ->not->toContain("'/dashboard'");
});
