import { Loader2 } from "lucide-react";
import clsx from "clsx";

export function Spinner({ className, size = 16 }: { className?: string, size?: number }) {
    return (
        <Loader2 className={clsx("animate-spin", className)} size={size} />
    );
}
