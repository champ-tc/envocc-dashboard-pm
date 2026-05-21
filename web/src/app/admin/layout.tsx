import { requireRoles } from '@/lib/auth';
import AdminLayout from './AdminLayout';

export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await requireRoles(['admin', 'superadmin']);

    return (
        <AdminLayout session={session}>
            {children}
        </AdminLayout>
    );
}
