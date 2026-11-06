import { requireRoles } from '@/lib/auth';


export default async function DdsUploadLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireRoles(['admin']);
    return children;
}
