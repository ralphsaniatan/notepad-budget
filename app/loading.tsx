import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

export default function Loading() {
    return (
        <main className="min-h-screen p-4 md:p-6 max-w-lg mx-auto pb-40">
            <LoadingSkeleton />
        </main>
    );
}
