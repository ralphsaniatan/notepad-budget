"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

export default function Loading() {
    const [frame, setFrame] = useState(1);

    useEffect(() => {
        const interval = setInterval(() => {
            setFrame((prev) => (prev % 6) + 1);
        }, 200); // Change frame every 200ms
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
            <div className="relative w-[300px] h-[300px]">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Image
                        key={i}
                        src={`/loading-frame-${i}.png`}
                        alt="Crunching Numbers"
                        fill
                        className={`object-contain mix-blend-multiply transition-opacity duration-75 ${frame === i ? 'opacity-100' : 'opacity-0'}`}
                        priority
                    />
                ))}
            </div>
            <h2 className="mt-4 text-2xl font-bold font-mono text-stone-900 tracking-tighter animate-pulse">
                Crunching numbers...
            </h2>
        </div>
    );
}
