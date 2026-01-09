import Image from "next/image";

export default function Loading() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-white text-center">
            <div className="animate-pulse">
                <Image
                    src="/loading-sketch.png"
                    alt="Crunching Numbers"
                    width={400}
                    height={400}
                    className="mx-auto mix-blend-multiply opacity-80"
                    priority
                />
                <h2 className="mt-8 text-2xl font-bold font-mono text-stone-900 tracking-tighter">
                    Crunching numbers...
                </h2>
            </div>
        </div>
    );
}
