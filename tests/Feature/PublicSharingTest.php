<?php

use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;

test('public registration is disabled', function () {
    expect(Route::has('register'))->toBeFalse();

    $this->get('/register')->assertNotFound();
});

test('passkey login can be hidden for temporary tunnel domains', function () {
    config()->set('fortify.passkeys.login_enabled', false);

    $this->get(route('login'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/login')
            ->where('canUsePasskeys', false));
});

test('sharing command uses hardened runtime settings', function () {
    $script = file_get_contents(base_path('scripts/share.ps1'));

    expect($script)
        ->toContain("\$env:APP_ENV = 'production'")
        ->toContain("\$env:APP_DEBUG = 'false'")
        ->toContain("\$env:SESSION_SECURE_COOKIE = 'true'")
        ->toContain("\$env:TRUST_TUNNEL_PROXIES = 'true'")
        ->toContain("\$env:FORTIFY_PASSKEYS_LOGIN_ENABLED = 'false'")
        ->toContain('queue:work')
        ->toContain('npx concurrently')
        ->toContain('shopify:setup');
});
