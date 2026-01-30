export default function Loading() {
    return (
        <main className="min-h-screen p-4 md:p-6 max-w-lg mx-auto space-y-6 pb-32 animate-pulse">
            <header className="flex items-center gap-4 mt-4">
                <div className="w-5 h-5 bg-stone-200 rounded" />
                <div className="h-6 w-32 bg-stone-200 rounded" />
            </header>

            {/* Debt Cards Skeleton */}
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-stone-200 space-y-3">
                        <div className="flex justify-between items-center">
                            <div className="h-5 w-28 bg-stone-200 rounded" />
                            <div className="h-4 w-12 bg-stone-200 rounded" />
                        </div>
                        <div className="h-8 w-36 bg-stone-200 rounded" />
                        <div className="h-2 bg-stone-100 rounded-full" />
                    </div>
                ))}
            </div>

            {/* Add Button Skeleton */}
            <div className="fixed bottom-6 right-6">
                <div className="h-14 w-32 bg-stone-300 rounded-full" />
            </div>
        </main>
    );
}
