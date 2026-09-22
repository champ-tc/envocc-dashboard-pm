'use client';

import { TriangleAlert } from 'lucide-react';

type DashboardBusyAlertProps = {
    message: string | null;
    prominent?: boolean;
};

export default function DashboardBusyAlert({ message, prominent = false }: DashboardBusyAlertProps) {
    if (!message) return null;

    return (
        <div
            role="alert"
            aria-live="polite"
            className={`typo-body alert alert-warning relative z-toolbar text-warning-content backdrop-blur-md ${
                prominent
                    ? 'border-2 border-warning bg-warning/30 px-5 py-4 shadow-xl'
                    : 'border border-warning/30 bg-warning/15 shadow-lg'
            }`}
        >
            <TriangleAlert aria-hidden="true" className={prominent ? 'h-7 w-7 shrink-0' : 'h-5 w-5 shrink-0'} />
            <div className="min-w-0 flex-1">
                <div className={'typo-subtitle ' + (prominent ? '' : '')}>ไม่สามารถโหลดข้อมูลแดชบอร์ดได้</div>
                <div className={'typo-caption ' + (prominent ? 'mt-1' : 'opacity-80')}>{message}</div>
            </div>
            <button type="button" className="typo-label btn btn-sm btn-warning shrink-0" onClick={() => window.location.reload()}>
                ลองใหม่
            </button>
        </div>
    );
}
