export default function Loading() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-stone-100">
            <div className="animate-pulse flex flex-col items-center gap-2">
                <span className="text-stone-400 font-mono text-xs uppercase tracking-widest">Opening Ledger...</span>
            </div>
        </main>
    );
}
