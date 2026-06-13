import Link from 'next/link';
import { Activity, Database, Download, UserRound } from 'lucide-react';

import BigDataDownload from '@/components/BigDataDownload';
import PM25Download from '@/components/PM25Download';
import { requireRoles } from '@/lib/auth';

export default async function UserMainPage() {
    const session = await requireRoles(['user']);

    return (
        <div className="auth-page">
            <div className="auth-page-header">
                <div>
                    <p className="mb-2 text-sm font-semibold text-blue-600">พื้นที่ใช้งานของคุณ</p>
                    <h1 className="auth-page-title">สวัสดีคุณ {session.name}</h1>
                    <p className="auth-page-description">ดูสถานการณ์และดาวน์โหลดชุดข้อมูลที่ได้รับอนุญาตจากระบบ</p>
                </div>
            </div>

            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <QuickLink
                    href="/dashboard/pm25"
                    title="สถานการณ์ PM2.5"
                    description="ติดตามค่าฝุ่นรายพื้นที่และช่วงเวลา"
                    icon={<Activity className="size-5" />}
                    color="blue"
                />
                <QuickLink
                    href="/dashboard/hdc"
                    title="ข้อมูลผู้ป่วย HDC"
                    description="ดูแนวโน้มและสถิติผู้ป่วยจาก HDC"
                    icon={<Database className="size-5" />}
                    color="sky"
                />
                <QuickLink
                    href="/user/profile"
                    title="ข้อมูลส่วนตัว"
                    description="แก้ไขชื่อและเปลี่ยนรหัสผ่าน"
                    icon={<UserRound className="size-5" />}
                    color="violet"
                />
            </section>

            <section className="auth-surface p-5 md:p-6">
                <div className="mb-5 flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                        <Download className="size-5" />
                    </span>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">ดาวน์โหลดข้อมูล</h2>
                        <p className="text-sm text-slate-500">เลือกชุดข้อมูลและช่วงเวลาที่ต้องการ</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <PM25Download />
                    <BigDataDownload />
                </div>
            </section>
        </div>
    );
}

function QuickLink({
    href,
    title,
    description,
    icon,
    color,
}: {
    href: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: 'blue' | 'sky' | 'violet';
}) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600',
        sky: 'bg-sky-50 text-sky-600 group-hover:bg-sky-600',
        violet: 'bg-violet-50 text-violet-600 group-hover:bg-violet-600',
    };

    return (
        <Link href={href} className="auth-surface group flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg">
            <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl transition-colors group-hover:text-white ${colors[color]}`}>
                {icon}
            </span>
            <span>
                <span className="block font-bold text-slate-900">{title}</span>
                <span className="mt-1 block text-sm leading-6 text-slate-500">{description}</span>
            </span>
        </Link>
    );
}
