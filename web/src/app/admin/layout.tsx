import { requireRoles } from '@/lib/auth';
import AdminLayout from './AdminLayout';

export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await requireRoles(['adminenvocc', 'admin_department', 'admin']);

    return (
        <div className="authenticated-font">
            <AdminLayout session={session}>
                {children}
            </AdminLayout>
        </div>
    );
}
