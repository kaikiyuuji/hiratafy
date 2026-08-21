<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

trait RemembersFilters
{
    /**
     * @param  array<string, mixed>  $defaults
     * @param  array<string, mixed>  $rules
     * @return array<string, mixed>
     */
    protected function rememberedFilters(
        Request $request,
        string $screen,
        array $defaults,
        array $rules,
    ): array {
        $userId = $request->user()?->getAuthIdentifier() ?? 'guest';
        $sessionKey = "remembered_filters.{$userId}.{$screen}";

        if ($request->boolean('reset_filters')) {
            $request->session()->forget($sessionKey);

            return $defaults;
        }

        $hasQueryFilters = false;

        foreach (array_keys($defaults) as $filter) {
            if ($request->query->has($filter)) {
                $hasQueryFilters = true;
                break;
            }
        }

        if ($hasQueryFilters) {
            $source = array_replace(
                $defaults,
                array_intersect_key($request->query->all(), $defaults),
            );
        } else {
            $remembered = $request->session()->get($sessionKey, []);
            $source = is_array($remembered)
                ? array_replace($defaults, array_intersect_key($remembered, $defaults))
                : $defaults;
        }

        $filters = array_replace(
            $defaults,
            Validator::make($source, $rules)->validate(),
        );

        $request->session()->put($sessionKey, $filters);

        return $filters;
    }
}
