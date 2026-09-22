import { requireRoles } from '@/lib/auth';
import AdminLayout from '../admin/AdminLayout';

export default async function UserLayout({ children }: { children: React.ReactNode }) {
    const session = await requireRoles(['user', 'admin_region', 'admin_province']);

    return (
        <div className="authenticated-font min-h-screen">
            <AdminLayout session={session}>
                {children}
            </AdminLayout>
        </div>
    );
}
