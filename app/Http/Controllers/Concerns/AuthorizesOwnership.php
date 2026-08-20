<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

trait AuthorizesOwnership
{
    protected function authorizeOwnership(Request $request, Model $model): void
    {
        abort_unless((int) $model->getAttribute('user_id') === $request->user()?->id, 404);
    }
}
