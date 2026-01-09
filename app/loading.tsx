"use client";

import { DotLottiePlayer } from '@dotlottie/react-player';

export default function Loading() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
            <div className="relative w-[300px] h-[300px]">
                <DotLottiePlayer
                    src="https://lottie.host/d8d7a317-458c-4060-9f16-f6fe945783fa/SIv2ZZXtTr.lottie"
                    loop
                    autoplay
                />
            </div>
            <h2 className="mt-4 text-2xl font-bold font-mono text-stone-900 tracking-tighter animate-pulse">
                Crunching numbers...
            </h2>
        </div>
    );
}
