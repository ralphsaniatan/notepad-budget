export default function Loading() {
    return (
        <main className="min-h-screen p-4 md:p-6 max-w-lg mx-auto space-y-6 pb-32 animate-pulse">
            <header className="flex items-center gap-4 mt-4">
                <div className="w-5 h-5 bg-stone-200 rounded" />
                <div className="h-6 w-48 bg-stone-200 rounded" />
            </header>

            {/* Add Form Skeleton */}
            <div className="bg-stone-100 p-4 rounded-xl space-y-4">
                <div className="h-3 w-24 bg-stone-200 rounded" />
                <div className="h-12 bg-stone-200 rounded-lg" />
                <div className="h-10 bg-stone-300 rounded-xl" />
            </div>

            {/* List Skeleton */}
            <div className="space-y-2">
                <div className="h-3 w-36 bg-stone-200 rounded" />
                <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="p-3 flex justify-between items-center">
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-stone-200 rounded" />
                                <div className="h-3 w-20 bg-stone-100 rounded" />
                            </div>
                            <div className="h-4 w-10 bg-stone-200 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
