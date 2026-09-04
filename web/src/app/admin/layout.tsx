import { requireRoles } from '@/lib/auth';
import AdminLayout from './AdminLayout';
import { Kanit } from 'next/font/google';

const authenticatedFont = Kanit({
    subsets: ['thai', 'latin'],
    weight: ['400', '500', '600', '700', '800', '900'],
    display: 'swap',
    variable: '--font-kanit',
});

export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await requireRoles(['admin', 'adminenvocc', 'admin_department', 'superadmin']);

    return (
        <div className={`${authenticatedFont.variable} authenticated-font`}>
            <AdminLayout session={session}>
                {children}
            </AdminLayout>
        </div>
    );
}
