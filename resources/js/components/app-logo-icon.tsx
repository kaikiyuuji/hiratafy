import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 5.5a2 2 0 0 1 2-2h2.5v10h13v-10H25a2 2 0 0 1 2 2v21a2 2 0 0 1-2 2h-2.5v-10h-13v10H7a2 2 0 0 1-2-2v-21Z" />
        </svg>
    );
}
