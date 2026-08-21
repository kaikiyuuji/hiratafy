<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\ConsolidatedMetrics;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ConsolidatedController extends Controller
{
    public function __invoke(Request $request, ConsolidatedMetrics $metrics): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return Inertia::render('consolidated', [
            'summary' => $metrics->build($user),
        ]);
    }
}
