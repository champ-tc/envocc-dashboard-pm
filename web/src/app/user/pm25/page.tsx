import PM25Download from '@/components/PM25Download';

export default function UserPM25Page() {
    return <RequestPage eyebrow="ขอข้อมูล" title="ขอข้อมูล PM2.5" description="เลือกช่วงวันที่เพื่อดาวน์โหลดข้อมูลค่าฝุ่น PM2.5"><PM25Download /></RequestPage>;
}

function RequestPage({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
    return <div className="auth-page max-w-4xl">
        <header className="auth-page-header"><div><p className="mb-1 text-xs font-semibold uppercase tracking-menu-label text-blue-600">{eyebrow}</p><h1 className="text-2xl font-bold text-slate-900">{title}</h1><p className="auth-page-description">{description}</p></div></header>
        <section className="auth-surface p-5 md:p-6">{children}</section>
    </div>;
}
