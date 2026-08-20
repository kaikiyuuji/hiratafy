<?php

namespace App\Http\Controllers;

use App\Http\Requests\CampaignSpendRequest;
use App\Models\Campaign;
use App\Models\CampaignDailySpend;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CampaignSpendController extends Controller
{
    public function index(Request $request): Response
    {
        $request->validate(['date' => ['nullable', 'date']]);
        $date = $request->filled('date')
            ? $request->string('date')->toString()
            : now()->toDateString();
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $campaigns = Campaign::query()
            ->where('user_id', $user->id)
            ->with(['dailySpends' => fn ($query) => $query->whereDate('spend_date', $date)])
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get()
            ->map(function (Campaign $campaign): array {
                $spend = $campaign->dailySpends->first();

                return [
                    'id' => $campaign->id,
                    'name' => $campaign->name,
                    'platform' => $campaign->platform,
                    'is_active' => $campaign->is_active,
                    'budget_cents' => $spend?->budget_cents,
                    'actual_spend_cents' => $spend?->actual_spend_cents,
                ];
            });

        return Inertia::render('campaign-spends/index', [
            'date' => $date,
            'campaigns' => $campaigns,
        ]);
    }

    public function store(CampaignSpendRequest $request): RedirectResponse
    {
        $data = $request->spendData();
        $campaignIds = collect($data['entries'])->pluck('campaign_id');
        $ownedCampaignCount = Campaign::query()
            ->where('user_id', $request->user()->id)
            ->whereIn('id', $campaignIds)
            ->count();

        if ($ownedCampaignCount !== $campaignIds->unique()->count()) {
            throw ValidationException::withMessages([
                'entries' => 'Uma ou mais campanhas não pertencem à sua conta.',
            ]);
        }

        DB::transaction(function () use ($data): void {
            foreach ($data['entries'] as $entry) {
                CampaignDailySpend::updateOrCreate(
                    [
                        'campaign_id' => $entry['campaign_id'],
                        'spend_date' => $data['spend_date'],
                    ],
                    [
                        'budget_cents' => $entry['budget_cents'],
                        'actual_spend_cents' => $entry['actual_spend_cents'],
                    ],
                );
            }
        });

        return to_route('campaign-spends.index', ['date' => $data['spend_date']])->with('toast', [
            'type' => 'success',
            'message' => 'Investimentos do dia salvos.',
        ]);
    }
}
