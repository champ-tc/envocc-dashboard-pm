'use client';

export default function DashboardBusyAlert({ message }: { message: string | null }) {
    if (!message) return null;

    return (
        <div role="alert" aria-live="polite" className="alert alert-warning relative z-toolbar border border-warning/30 bg-warning/15 text-warning-content shadow-lg backdrop-blur-md">
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.7 2.5 17.2A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.8L13.7 3.7a2 2 0 0 0-3.4 0Z" />
            </svg>
            <div>
                <div className="font-extrabold">ขณะนี้มีผู้ใช้งานจำนวนมาก</div>
                <div className="text-xs opacity-80">{message}</div>
            </div>
        </div>
    );
}
