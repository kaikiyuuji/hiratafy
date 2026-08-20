<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesOwnership;
use App\Http\Requests\CampaignRequest;
use App\Models\Campaign;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CampaignController extends Controller
{
    use AuthorizesOwnership;

    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $campaigns = Campaign::query()
            ->where('user_id', $user->id)
            ->withCount(['sales', 'dailySpends'])
            ->orderByDesc('is_active')
            ->latest()
            ->get()
            ->map(fn (Campaign $campaign): array => $this->serializeCampaign($campaign));

        return Inertia::render('campaigns/index', ['campaigns' => $campaigns]);
    }

    public function create(): Response
    {
        return Inertia::render('campaigns/form', ['campaign' => null]);
    }

    public function store(CampaignRequest $request): RedirectResponse
    {
        $request->user()->campaigns()->create($request->campaignData());

        return to_route('campaigns.index')->with('toast', [
            'type' => 'success',
            'message' => 'Campanha criada com sucesso.',
        ]);
    }

    public function edit(Request $request, Campaign $campaign): Response
    {
        $this->authorizeOwnership($request, $campaign);

        return Inertia::render('campaigns/form', [
            'campaign' => $this->serializeCampaign($campaign),
        ]);
    }

    public function update(CampaignRequest $request, Campaign $campaign): RedirectResponse
    {
        $this->authorizeOwnership($request, $campaign);
        $campaign->update($request->campaignData());

        return to_route('campaigns.index')->with('toast', [
            'type' => 'success',
            'message' => 'Campanha atualizada.',
        ]);
    }

    /** @return array<string, mixed> */
    private function serializeCampaign(Campaign $campaign): array
    {
        return [
            'id' => $campaign->id,
            'name' => $campaign->name,
            'platform' => $campaign->platform,
            'is_active' => $campaign->is_active,
            'starts_on' => $campaign->starts_on?->toDateString(),
            'ends_on' => $campaign->ends_on?->toDateString(),
            'notes' => $campaign->notes,
            'sales_count' => $campaign->sales_count ?? 0,
            'daily_spends_count' => $campaign->daily_spends_count ?? 0,
        ];
    }
}
