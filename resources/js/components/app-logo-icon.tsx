import type { ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type AppLogoIconProps = Omit<
    ImgHTMLAttributes<HTMLImageElement>,
    'src' | 'width' | 'height'
>;

export default function AppLogoIcon({
    alt = '',
    className,
    ...props
}: AppLogoIconProps) {
    return (
        <img
            {...props}
            src="/hiratafy-icon.png"
            alt={alt}
            width={256}
            height={256}
            className={cn('shrink-0 object-contain', className)}
        />
    );
}
