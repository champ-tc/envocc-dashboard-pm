 'use client';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

type Station = { stationId: string | null; stationIdNew: string | null; stationName: string | null; stationType: string | null; province: string | null; district: string | null; latitude: number | null; longitude: number | null };

export default function UserStationsPage() {
    const [stations, setStations] = useState<Station[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    useEffect(() => { fetch('/api/user/stations').then((r) => r.json()).then((d) => setStations(d.stations ?? [])).catch(() => toast.error('ไม่สามารถโหลดข้อมูลสถานีได้')).finally(() => setLoading(false)); }, []);
    const filtered = useMemo(() => { const q = query.toLowerCase().trim(); return q ? stations.filter((s) => [s.stationId, s.stationIdNew, s.stationName, s.province, s.district].some((v) => v?.toLowerCase().includes(q))) : stations; }, [query, stations]);
    const exportStations = () => {
        const headers = ['ลำดับ', 'ชื่อสถานี', 'ประเภท', 'จังหวัด', 'อำเภอ', 'Latitude', 'Longitude'];
        const escapeCsv = (value: string | number | null) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const csv = [headers, ...filtered.map((s, index) => [index + 1, s.stationName, s.stationType, s.province, s.district, s.latitude, s.longitude])]
            .map((row) => row.map(escapeCsv).join(',')).join('\n');
        const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `stations_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };
    return <div className="auth-page"><header className="auth-page-header"><div><p className="mb-1 text-xs font-semibold uppercase tracking-menu-label text-blue-600">ขอข้อมูล</p><h1 className="text-2xl font-bold text-slate-900">ขอข้อมูล Stations</h1><p className="auth-page-description">ข้อมูลสถานีตรวจวัดที่พร้อมใช้งานในระบบ</p></div><div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row"><input aria-label="ค้นหาสถานี" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาชื่อสถานี จังหวัด หรือรหัส..." className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 sm:w-80" /><button type="button" onClick={exportStations} disabled={loading || filtered.length === 0} className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">Export CSV</button></div></header><section className="auth-surface overflow-hidden"><div className="border-b border-slate-100 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-700">ทั้งหมด {filtered.length.toLocaleString('th-TH')} สถานี</div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs font-bold text-slate-400"><th className="px-5 py-4">ลำดับ</th><th className="px-5 py-4">ชื่อสถานี</th><th className="px-5 py-4">ประเภท</th><th className="px-5 py-4">จังหวัด</th><th className="px-5 py-4">อำเภอ</th><th className="px-5 py-4">พิกัด</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">กำลังโหลดข้อมูลสถานี...</td></tr> : filtered.map((s, i) => <tr key={`${s.stationIdNew ?? s.stationId}-${i}`} className="border-b border-slate-50 hover:bg-slate-50"><td className="px-5 py-4 font-semibold text-slate-500">{i + 1}</td><td className="px-5 py-4 font-medium text-slate-800">{s.stationName || '-'}</td><td className="px-5 py-4 text-slate-500">{s.stationType || '-'}</td><td className="px-5 py-4 text-slate-600">{s.province || '-'}</td><td className="px-5 py-4 text-slate-600">{s.district || '-'}</td><td className="px-5 py-4 text-slate-500">{s.latitude ?? '-'}, {s.longitude ?? '-'}</td></tr>)}</tbody></table></div></section></div>;
}
