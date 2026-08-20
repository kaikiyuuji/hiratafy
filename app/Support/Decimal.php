<?php

namespace App\Support;

final class Decimal
{
    public static function moneyToCents(string $value): int
    {
        return self::toScaledInteger($value, 2);
    }

    public static function percentageToBasisPoints(string $value): int
    {
        return self::toScaledInteger($value, 2);
    }

    private static function toScaledInteger(string $value, int $scale): int
    {
        $value = trim($value);
        $negative = str_starts_with($value, '-');
        $value = ltrim($value, '+-');
        [$whole, $fraction] = array_pad(explode('.', $value, 2), 2, '');
        $fraction = str_pad(substr($fraction, 0, $scale), $scale, '0');
        $multiplier = 10 ** $scale;
        $result = ((int) $whole * $multiplier) + (int) $fraction;

        return $negative ? -$result : $result;
    }
}
