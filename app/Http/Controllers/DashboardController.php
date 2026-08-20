<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\DashboardMetrics;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request, DashboardMetrics $metrics): Response
    {
        $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ]);

        $start = $request->filled('start_date')
            ? Carbon::parse($request->string('start_date')->toString())
            : now()->startOfMonth();
        $end = $request->filled('end_date')
            ? Carbon::parse($request->string('end_date')->toString())
            : now();
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return Inertia::render('dashboard', [
            'filters' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
            ...$metrics->build($user, $start, $end),
        ]);
    }
}
