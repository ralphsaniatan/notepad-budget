"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export function LoadingScreen() {
    const [show, setShow] = useState(true);

    useEffect(() => {
        // Hide after 500ms or when content is ready
        const timer = setTimeout(() => setShow(false), 500);
        return () => clearTimeout(timer);
    }, []);

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-stone-50 flex items-center justify-center animate-out fade-out duration-300">
            <div className="flex flex-col items-center gap-4">
                <img src="/logo.png" alt="Notepad Budget" className="w-24 h-24 object-contain" />
                <Loader2 className="w-6 h-6 text-stone-400 animate-spin" />
            </div>
        </div>
    );
}
