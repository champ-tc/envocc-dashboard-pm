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
        <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
            <Sidebar 
                role={session.role} 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
            />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Navbar 
                    session={session} 
                    onToggleSidebar={() => setIsSidebarOpen(true)} 
                />
                <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 relative">
                    {children}
                </main>
            </div>
        </div>
    );
}
