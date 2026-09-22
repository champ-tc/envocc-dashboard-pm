'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';

export default function AdminLayout({
    children,
    session,
}: {
        children: React.ReactNode;
        session: any;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="typo-body authenticated-shell flex h-screen overflow-hidden text-slate-900">
            <Sidebar 
                role={session.role} 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
            />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <main className="auth-main relative flex-1 overflow-y-auto">
                    <div className="auth-grid-pattern pointer-events-none absolute inset-0" />
                    <div className="auth-content">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
