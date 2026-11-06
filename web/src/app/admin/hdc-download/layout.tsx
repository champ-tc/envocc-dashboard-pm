import { requireRoles } from '@/lib/auth';


export default async function HdcDownloadLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireRoles(['admin']);
    return children;
}
