export function LoadingSkeleton() {
    return (
        <div className="animate-pulse space-y-6">
            {/* Header Skeleton */}
            <div className="flex justify-between items-center mt-4">
                <div className="h-8 w-40 bg-stone-200 rounded"></div>
                <div className="h-4 w-24 bg-stone-200 rounded"></div>
            </div>

            {/* Hero Card Skeleton */}
            <div className="bg-stone-200 h-48 rounded-none shadow-xl border border-stone-300"></div>

            {/* List Skeleton */}
            <div className="space-y-4">
                <div className="h-4 w-32 bg-stone-200 rounded"></div>
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex justify-between p-3 border-b border-stone-200">
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-stone-200 rounded"></div>
                                <div className="h-3 w-20 bg-stone-200 rounded"></div>
                            </div>
                            <div className="h-6 w-16 bg-stone-200 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
