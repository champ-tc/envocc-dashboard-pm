'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Mount expensive charts only when they approach the scroll viewport. */
export default function DeferredChart({ children }: { children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!ref.current) return;
        if (typeof IntersectionObserver === 'undefined') {
            setVisible(true);
            return;
        }
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) {
                setVisible(true);
                observer.disconnect();
            }
        }, { rootMargin: '120px' });
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} className="h-chart-standard shrink-0">
            {visible ? children : <div className="h-full rounded-3xl bg-slate-700" aria-hidden="true" />}
        </div>
    );
}
