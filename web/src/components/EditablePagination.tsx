'use client';

import { KeyboardEvent, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function EditablePagination({
    currentPage,
    totalPages,
    onPageChange,
}: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}) {
    const [pageInput, setPageInput] = useState(currentPage.toString());
    const safeTotalPages = Math.max(1, totalPages);

    useEffect(() => {
        setPageInput(currentPage.toString());
    }, [currentPage]);

    const goToPage = () => {
        const requestedPage = Number(pageInput);
        const nextPage = Number.isFinite(requestedPage)
            ? Math.min(Math.max(Math.trunc(requestedPage), 1), safeTotalPages)
            : currentPage;
        onPageChange(nextPage);
        setPageInput(nextPage.toString());
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') goToPage();
    };

    return (
        <div className="flex items-center gap-2">
            <button title="หน้าก่อนหน้า" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} className="typo-label btn btn-square min-h-11 rounded-xl">
                <ChevronLeft className="h-4 w-4" />
            </button>
            <label className="typo-label flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-slate-500">
                <input
                    type="number"
                    min={1}
                    max={safeTotalPages}
                    value={pageInput}
                    onChange={(event) => setPageInput(event.target.value)}
                    onBlur={goToPage}
                    onKeyDown={handleKeyDown}
                    className="typo-body-sm input input-sm w-14 text-center"
                    aria-label="หน้าปัจจุบัน"
                />
                <span>/ {safeTotalPages}</span>
            </label>
            <button title="หน้าถัดไป" disabled={currentPage === safeTotalPages} onClick={() => onPageChange(currentPage + 1)} className="typo-label btn btn-square min-h-11 rounded-xl">
                <ChevronRight className="h-4 w-4" />
            </button>
        </div>
    );
}
