import { requireRoles } from '@/lib/auth';
import { Noto_Sans_Thai } from 'next/font/google';
import AdminLayout from '../admin/AdminLayout';

const authenticatedFont = Noto_Sans_Thai({
    subsets: ['thai', 'latin'],
    weight: 'variable',
    display: 'swap',
    variable: '--font-authenticated',
});

export default async function UserLayout({ children }: { children: React.ReactNode }) {
    const session = await requireRoles(['user']);

    return (
        <div className={`${authenticatedFont.variable} authenticated-font min-h-screen`}>
            <AdminLayout session={session}>
                {children}
            </AdminLayout>
        </div>
    );
}
