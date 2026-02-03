"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function PWAUpdater() {
    useEffect(() => {
        // Only run on client
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

        // Handler for when the service worker controller changes (new version takes over)
        const handleControllerChange = () => {
            // Show a gentle toast
            toast.message("Update installed", {
                description: "Reloading to apply changes...",
                icon: <Loader2 className="animate-spin text-stone-500" size={16} />,
                duration: 2000,
            });

            // Wait briefly for the toast to be seen, then reload
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        };

        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

        return () => {
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        };
    }, []);

    return null;
}
