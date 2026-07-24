import { requireRoles } from '@/lib/auth';
import AdminLayout from './AdminLayout';
import { Noto_Sans_Thai } from 'next/font/google';

const authenticatedFont = Noto_Sans_Thai({
    subsets: ['thai', 'latin'],
    weight: 'variable',
    display: 'swap',
    variable: '--font-authenticated',
});

export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await requireRoles(['admin', 'adminenvocc', 'superadmin']);

    return (
        <div className={`${authenticatedFont.variable} authenticated-font`}>
            <AdminLayout session={session}>
                {children}
            </AdminLayout>
        </div>
    );
}
