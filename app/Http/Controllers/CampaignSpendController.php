<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RemembersFilters;
use App\Http\Requests\CampaignSpendRequest;
use App\Models\Campaign;
use App\Models\CampaignDailySpend;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CampaignSpendController extends Controller
{
    use RemembersFilters;

    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $filters = $this->rememberedFilters(
            $request,
            'campaign-spends',
            ['date' => now()->toDateString()],
            ['date' => ['required', 'date']],
        );
        $date = (string) $filters['date'];

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
            'calendar' => $this->monthlyCalendar($user, Carbon::parse($date)),
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
            $spendDate = Carbon::parse($data['spend_date'])->startOfDay();

            foreach ($data['entries'] as $entry) {
                $spend = CampaignDailySpend::query()
                    ->where('campaign_id', $entry['campaign_id'])
                    ->whereDate('spend_date', $spendDate->toDateString())
                    ->first() ?? new CampaignDailySpend;

                $spend->fill([
                    'campaign_id' => $entry['campaign_id'],
                    'spend_date' => $spendDate,
                    'budget_cents' => $entry['budget_cents'],
                    'actual_spend_cents' => $entry['actual_spend_cents'],
                ])->save();
            }
        });

        return to_route('campaign-spends.index', ['date' => $data['spend_date']])->with('toast', [
            'type' => 'success',
            'message' => 'Investimentos do dia salvos.',
        ]);
    }

    /**
     * @return array{
     *     month: string,
     *     previous_month_date: string,
     *     next_month_date: string,
     *     days_count: int,
     *     budget_total_cents: int,
     *     days: array<int, array{
     *         date: string,
     *         budget_total_cents: int,
     *         entries: array<int, array{
     *             campaign_id: int,
     *             campaign_name: string,
     *             budget_cents: int,
     *             actual_spend_cents: int|null
     *         }>
     *     }>
     * }
     */
    private function monthlyCalendar(User $user, Carbon $selectedDate): array
    {
        $monthStart = $selectedDate->copy()->startOfMonth();
        $monthEnd = $selectedDate->copy()->endOfMonth();
        $spends = CampaignDailySpend::query()
            ->whereHas('campaign', fn ($query) => $query->where('user_id', $user->id))
            ->whereDate('spend_date', '>=', $monthStart->toDateString())
            ->whereDate('spend_date', '<=', $monthEnd->toDateString())
            ->with('campaign:id,name')
            ->orderBy('spend_date')
            ->get();
        $days = [];

        foreach ($spends as $spend) {
            $date = $spend->spend_date->toDateString();
            $days[$date] ??= [
                'date' => $date,
                'budget_total_cents' => 0,
                'entries' => [],
            ];
            $days[$date]['budget_total_cents'] += $spend->budget_cents;
            $days[$date]['entries'][] = [
                'campaign_id' => $spend->campaign_id,
                'campaign_name' => $spend->campaign->name,
                'budget_cents' => $spend->budget_cents,
                'actual_spend_cents' => $spend->actual_spend_cents,
            ];
        }

        foreach ($days as &$day) {
            usort(
                $day['entries'],
                fn (array $first, array $second): int => strcasecmp(
                    $first['campaign_name'],
                    $second['campaign_name'],
                ),
            );
        }
        unset($day);

        return [
            'month' => $monthStart->format('Y-m'),
            'previous_month_date' => $monthStart->copy()->subMonth()->toDateString(),
            'next_month_date' => $monthStart->copy()->addMonth()->toDateString(),
            'days_count' => count($days),
            'budget_total_cents' => (int) $spends->sum('budget_cents'),
            'days' => array_values($days),
        ];
    }
}
