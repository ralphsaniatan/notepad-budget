import clsx from 'clsx';
import { ReactNode } from 'react';

interface PaperCardProps {
    children: ReactNode;
    className?: string;
    title?: string;
}

export function PaperCard({ children, className, title }: PaperCardProps) {
    return (
        <div
            className={clsx(
                "relative bg-white shadow-sm border border-stone-200 p-6",
                "before:absolute before:top-0 before:left-0 before:w-full before:h-1 before:bg-stone-100", // Top stylized edge
                className
            )}
            style={{
                boxShadow: "2px 2px 5px rgba(0,0,0,0.05)", // Gentle lift
            }}
        >
            {title && (
                <h3 className="text-stone-500 text-sm uppercase tracking-wider font-bold mb-4 border-b-2 border-stone-100 pb-2">
                    {title}
                </h3>
            )}
            <div className="font-mono text-stone-800">
                {children}
            </div>
        </div>
    );
}
