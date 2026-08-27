import CloudLoader from '@/components/CloudLoader';

export default function DashboardLoading() {
    return <CloudLoader label="กำลังโหลดข้อมูล หากข้อมูลมีจำนวนมาก อาจใช้เวลาสักครู่ กรุณารอ" />;
}
