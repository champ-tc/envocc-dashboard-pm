import { requireRoles } from '@/lib/auth';
import { Kanit } from 'next/font/google';
import AdminLayout from '../admin/AdminLayout';

const authenticatedFont = Kanit({
    subsets: ['thai', 'latin'],
    weight: ['400', '500', '600', '700', '800', '900'],
    display: 'swap',
    variable: '--font-kanit',
});

export default async function UserLayout({ children }: { children: React.ReactNode }) {
    const session = await requireRoles(['user', 'admin_region', 'admin_province']);

    return (
        <div className={`${authenticatedFont.variable} authenticated-font min-h-screen`}>
            <AdminLayout session={session}>
                {children}
            </AdminLayout>
        </div>
    );
}
