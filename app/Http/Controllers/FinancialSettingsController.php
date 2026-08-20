<?php

namespace App\Http\Controllers;

use App\Http\Requests\FinancialSettingsRequest;
use App\Models\StoreSetting;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FinancialSettingsController extends Controller
{
    public function edit(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $settings = StoreSetting::forUser($user);

        return Inertia::render('settings/financial', [
            'settings' => [
                'currency' => $settings->currency,
                'fixed_shipping_cents' => $settings->fixed_shipping_cents,
                'free_shipping_threshold_cents' => $settings->free_shipping_threshold_cents,
            ],
        ]);
    }

    public function update(FinancialSettingsRequest $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        StoreSetting::forUser($user)->update($request->settingsData());

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Regras de frete atualizadas.',
        ]);
    }
}
