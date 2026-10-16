'use client';

import { useState, useCallback } from 'react';
import { ImageDown, Loader2 } from 'lucide-react';
import { toJpeg } from 'html-to-image';

interface ExportImageButtonProps {
    targetRef: React.RefObject<HTMLElement | null>;
    filename: string;
}

export default function ExportImageButton({ targetRef, filename }: ExportImageButtonProps) {
    const [exporting, setExporting] = useState(false);

    const handleExport = useCallback(async () => {
        const node = targetRef.current;
        if (!node || exporting) return;

        try {
            setExporting(true);

            const filter = (domNode: Node) => {
                if (domNode instanceof HTMLElement) {
                    if (domNode.classList.contains('export-ignore')) return false;
                    if (domNode.classList.contains('fixed-top-tooltip')) return false;
                    if (domNode.classList.contains('leaflet-control-container')) return false;
                    if (domNode.classList.contains('leaflet-popup')) return false;
                }
                return true;
            };

            const options = {
                quality: 0.95,
                pixelRatio: 2,
                backgroundColor: '#334155',
                skipFonts: true,
                cacheBust: true,
                filter,
            };

            let dataUrl = '';
            try {
                dataUrl = await toJpeg(node, options);
            } catch {
                // Fallback to standard pixel ratio
                dataUrl = await toJpeg(node, { ...options, pixelRatio: 1 });
            }

            if (!dataUrl) return;

            const link = document.createElement('a');
            link.download = `${filename}.jpg`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Failed to export image:', error);
        } finally {
            setExporting(false);
        }
    }, [targetRef, filename, exporting]);

    return (
        <div className="export-ignore relative group/export inline-flex items-center">
            <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                title="Export JPG"
                aria-label="Export JPG"
                className="typo-label btn btn-ghost btn-sm btn-circle size-9 min-h-9 border border-white/15 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white disabled:opacity-50 flex items-center justify-center transition-all"
            >
                {exporting ? (
                    <Loader2 aria-hidden="true" className="size-4 animate-spin text-white" />
                ) : (
                    <ImageDown aria-hidden="true" className="size-4" />
                )}
            </button>
            <div className="pointer-events-none absolute right-0 top-full mt-2 hidden group-hover/export:flex items-center z-50 whitespace-nowrap rounded-xl bg-slate-900/95 px-2.5 py-1.5 typo-caption text-white shadow-2xl border border-white/10 backdrop-blur-md">
                Export JPG
            </div>
        </div>
    );
}
