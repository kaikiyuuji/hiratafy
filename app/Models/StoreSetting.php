<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreSetting extends Model
{
    protected $fillable = [
        'user_id',
        'currency',
        'fixed_shipping_cents',
        'free_shipping_threshold_cents',
    ];

    protected function casts(): array
    {
        return [
            'fixed_shipping_cents' => 'integer',
            'free_shipping_threshold_cents' => 'integer',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function forUser(User $user): self
    {
        return self::firstOrCreate(
            ['user_id' => $user->id],
            [
                'currency' => 'USD',
                'fixed_shipping_cents' => 0,
                'free_shipping_threshold_cents' => 9000,
            ],
        );
    }
}
