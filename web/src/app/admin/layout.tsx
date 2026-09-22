import { requireRoles } from '@/lib/auth';
import AdminLayout from './AdminLayout';

export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await requireRoles(['admin', 'adminenvocc', 'admin_department', 'superadmin']);

    return (
        <div className="authenticated-font">
            <AdminLayout session={session}>
                {children}
            </AdminLayout>
        </div>
    );
}
