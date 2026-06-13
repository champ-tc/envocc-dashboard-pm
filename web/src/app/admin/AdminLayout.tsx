'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';

export default function AdminLayout({
    children,
    session
}: {
    children: React.ReactNode;
    session: any;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-slate-100 text-slate-900 font-sans">
            <Sidebar 
                role={session.role} 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
            />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <Navbar 
                    session={session} 
                    onToggleSidebar={() => setIsSidebarOpen(true)} 
                />
                <main className="auth-main relative flex-1 overflow-y-auto">
                    <div className="auth-content">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
