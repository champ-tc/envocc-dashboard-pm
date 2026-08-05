'use client';

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
            className={`alert alert-warning relative z-toolbar text-warning-content backdrop-blur-md ${
                prominent
                    ? 'border-2 border-warning bg-warning/30 px-5 py-4 shadow-xl'
                    : 'border border-warning/30 bg-warning/15 shadow-lg'
            }`}
        >
            <svg className={prominent ? 'h-7 w-7 shrink-0' : 'h-5 w-5 shrink-0'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.7 2.5 17.2A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.8L13.7 3.7a2 2 0 0 0-3.4 0Z" />
            </svg>
            <div className="min-w-0 flex-1">
                <div className={prominent ? 'text-lg font-black sm:text-xl' : 'font-extrabold'}>ไม่สามารถโหลดข้อมูลแดชบอร์ดได้</div>
                <div className={prominent ? 'mt-1 text-sm font-medium' : 'text-xs opacity-80'}>{message}</div>
            </div>
            <button type="button" className="btn btn-sm btn-warning shrink-0" onClick={() => window.location.reload()}>
                ลองใหม่
            </button>
        </div>
    );
}
