import BigDataDownload from '@/components/BigDataDownload';

export default function UserDDSPage() {
    return <div className="auth-page max-w-4xl"><header className="auth-page-header"><div><p className="typo-caption mb-1 uppercase text-blue-600">ขอข้อมูล</p><h1 className="typo-title text-slate-900">ขอข้อมูล DDS</h1><p className="typo-body auth-page-description">ส่งคำขอสิทธิ์และดาวน์โหลดข้อมูล DDS</p></div></header><section className="auth-surface p-5 md:p-6"><BigDataDownload title="ข้อมูล DDS" description="ไฟล์ข้อมูลผู้ป่วยจากระบบ Digital Disease Surveillance" /></section></div>;
}
