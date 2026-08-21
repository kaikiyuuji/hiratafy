<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RemembersFilters;
use App\Models\User;
use App\Services\DashboardMetrics;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    use RemembersFilters;

    public function __invoke(Request $request, DashboardMetrics $metrics): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $filters = $this->rememberedFilters(
            $request,
            'dashboard',
            [
                'start_date' => now()->startOfMonth()->toDateString(),
                'end_date' => now()->toDateString(),
            ],
            [
                'start_date' => ['required', 'date'],
                'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            ],
        );
        $start = Carbon::parse((string) $filters['start_date']);
        $end = Carbon::parse((string) $filters['end_date']);

        return Inertia::render('dashboard', [
            'filters' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
            ...$metrics->build($user, $start, $end),
        ]);
    }
}
