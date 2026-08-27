'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';

export default function SecurityModal() {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog || dialog.matches(':modal')) return;

        // Render the notice open before hydration, then promote it to a modal
        // for native focus trapping, Escape handling, and the top layer.
        dialog.removeAttribute('open');
        dialog.showModal();
    }, []);

    return (
        <dialog ref={dialogRef} open className="modal" aria-label="ประกาศด้านความปลอดภัย">
            <div className="modal-box w-11/12 max-w-6xl bg-base-100 p-3 sm:p-4">
                <form method="dialog" className="mb-3 flex justify-end">
                    <button className="btn btn-sm btn-ghost" aria-label="ปิดประกาศด้านความปลอดภัย">
                        ปิด ✕
                    </button>
                </form>
                <Image
                    src="/img/Security.jpg"
                    alt="ประกาศด้านความปลอดภัย"
                    width={2400}
                    height={1350}
                    sizes="(max-width: 1280px) 92vw, 1152px"
                    loading="eager"
                    unoptimized
                    className="h-auto max-h-[75dvh] w-full object-contain"
                />
            </div>
            <form method="dialog" className="modal-backdrop">
                <button aria-label="ปิดประกาศ">ปิด</button>
            </form>
        </dialog>
    );
}
