import { requireRoles } from '@/lib/auth';


export default async function HdcDownloadLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireRoles(['superadmin']);
    return children;
}
