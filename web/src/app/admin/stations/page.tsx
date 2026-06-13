'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import EditablePagination from '@/components/EditablePagination';

type Station = {
    rowId: string;
    stationId: string | null;
    stationIdNew: string | null;
    stationName: string | null;
    stationType: string | null;
    latitude: number | null;
    longitude: number | null;
    province: string | null;
    district: string | null;
    subdistrict: string | null;
    healthRegion: string | null;
};

type StationForm = Omit<Station, 'rowId'>;

const emptyForm: StationForm = {
    stationId: '',
    stationIdNew: '',
    stationName: '',
    stationType: '',
    latitude: null,
    longitude: null,
    province: '',
    district: '',
    subdistrict: '',
    healthRegion: '',
};

const textFields: { key: keyof StationForm; label: string; placeholder?: string }[] = [
    { key: 'stationId', label: 'Station ID *', placeholder: 'เช่น 02t' },
    { key: 'stationIdNew', label: 'Station ID ใหม่', placeholder: 'รหัสที่ใช้เชื่อมข้อมูล' },
    { key: 'stationName', label: 'ชื่อสถานี' },
    { key: 'stationType', label: 'ประเภทสถานี' },
    { key: 'province', label: 'จังหวัด' },
    { key: 'district', label: 'อำเภอ / เขต' },
    { key: 'subdistrict', label: 'ตำบล / แขวง' },
    { key: 'healthRegion', label: 'เขตสุขภาพ' },
];

async function getErrorMessage(response: Response) {
    const body = await response.json().catch(() => null);
    return body?.error || 'เกิดข้อผิดพลาดในการดำเนินการ';
}

export default function StationManagementPage() {
    const [stations, setStations] = useState<Station[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [editingStation, setEditingStation] = useState<Station | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [form, setForm] = useState<StationForm>(emptyForm);
    const itemsPerPage = 15;

    const fetchStations = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/stations');
            if (!response.ok) throw new Error(await getErrorMessage(response));
            const data = await response.json();
            setStations(data.stations);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'ไม่สามารถโหลดข้อมูลสถานีได้');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStations();
    }, []);

    const filteredStations = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return stations;
        return stations.filter((station) => [
            station.stationId,
            station.stationIdNew,
            station.stationName,
            station.province,
            station.district,
            station.subdistrict,
            station.healthRegion,
        ].some((value) => value?.toLowerCase().includes(query)));
    }, [searchQuery, stations]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredStations.length / itemsPerPage));
    const displayedStations = filteredStations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const openCreateForm = () => {
        setEditingStation(null);
        setForm(emptyForm);
        setIsFormOpen(true);
    };

    const openEditForm = (station: Station) => {
        setEditingStation(station);
        setForm({
            stationId: station.stationId || '',
            stationIdNew: station.stationIdNew || '',
            stationName: station.stationName || '',
            stationType: station.stationType || '',
            latitude: station.latitude,
            longitude: station.longitude,
            province: station.province || '',
            district: station.district || '',
            subdistrict: station.subdistrict || '',
            healthRegion: station.healthRegion || '',
        });
        setIsFormOpen(true);
    };

    const updateForm = (key: keyof StationForm, value: string) => {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSaving(true);
        try {
            const response = await fetch('/api/admin/stations', {
                method: editingStation ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, rowId: editingStation?.rowId }),
            });
            if (!response.ok) throw new Error(await getErrorMessage(response));
            toast.success(editingStation ? 'แก้ไขสถานีสำเร็จ' : 'เพิ่มสถานีสำเร็จ');
            setIsFormOpen(false);
            await fetchStations();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'ไม่สามารถบันทึกข้อมูลได้');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (station: Station) => {
        const name = station.stationName || station.stationId || 'รายการนี้';
        if (!confirm(`ยืนยันการลบสถานี "${name}" ใช่หรือไม่?`)) return;
        try {
            const response = await fetch(`/api/admin/stations?rowId=${encodeURIComponent(station.rowId)}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error(await getErrorMessage(response));
            toast.success('ลบสถานีสำเร็จ');
            await fetchStations();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'ไม่สามารถลบข้อมูลได้');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-page-header">
                <div>
                    <h1 className="auth-page-title">จัดการสถานี</h1>
                    <p className="auth-page-description">เพิ่ม แก้ไข และลบข้อมูลสถานีตรวจวัดในฐานข้อมูล</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อสถานี จังหวัด หรือรหัส..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="w-full sm:w-80 bg-white border border-slate-200 px-4 py-3 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                    />
                    <button onClick={openCreateForm} className="px-5 py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">
                        + เพิ่มสถานี
                    </button>
                </div>
            </div>

            <div className="auth-surface overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[1100px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold text-[11px] uppercase tracking-widest">
                                <th className="px-5 py-4">รหัส</th>
                                <th className="px-5 py-4">สถานี</th>
                                <th className="px-5 py-4">พื้นที่</th>
                                <th className="px-5 py-4">เขตสุขภาพ</th>
                                <th className="px-5 py-4">พิกัด</th>
                                <th className="px-5 py-4 text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr><td colSpan={6} className="text-center py-20 text-slate-400 font-bold">กำลังโหลดข้อมูล...</td></tr>
                            ) : displayedStations.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-20 text-slate-400 font-medium">ไม่พบข้อมูลสถานี</td></tr>
                            ) : displayedStations.map((station) => (
                                <tr key={station.rowId} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-blue-600">{station.stationId || '-'}</div>
                                        <div className="text-xs text-slate-400">{station.stationIdNew || '-'}</div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-slate-800">{station.stationName || '-'}</div>
                                        <div className="text-xs text-slate-400">{station.stationType || '-'}</div>
                                    </td>
                                    <td className="px-5 py-4 text-sm text-slate-600">
                                        <div>{station.province || '-'}</div>
                                        <div className="text-xs text-slate-400">{[station.district, station.subdistrict].filter(Boolean).join(' / ') || '-'}</div>
                                    </td>
                                    <td className="px-5 py-4 text-sm text-slate-600">{station.healthRegion || '-'}</td>
                                    <td className="px-5 py-4 text-xs text-slate-500">
                                        {station.latitude ?? '-'}, {station.longitude ?? '-'}
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => openEditForm(station)} className="px-3 py-2 rounded-xl bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100">แก้ไข</button>
                                            <button onClick={() => handleDelete(station)} className="px-3 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100">ลบ</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {!isLoading && filteredStations.length > 0 && (
                    <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-4">
                        <div className="text-xs font-bold text-slate-400">
                            แสดง {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredStations.length)} จาก {filteredStations.length} รายการ
                        </div>
                        <EditablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </div>
                )}
            </div>

            {isFormOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black text-slate-800">{editingStation ? 'แก้ไขสถานี' : 'เพิ่มสถานี'}</h2>
                            <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-700 text-2xl">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {textFields.map((field) => (
                                    <label key={field.key} className="block">
                                        <span className="block mb-1.5 text-xs font-bold text-slate-500">{field.label}</span>
                                        <input
                                            required={field.key === 'stationId'}
                                            value={(form[field.key] as string | null) || ''}
                                            onChange={(event) => updateForm(field.key, event.target.value)}
                                            placeholder={field.placeholder}
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                        />
                                    </label>
                                ))}
                                {(['latitude', 'longitude'] as const).map((key) => (
                                    <label key={key} className="block">
                                        <span className="block mb-1.5 text-xs font-bold text-slate-500">{key === 'latitude' ? 'Latitude' : 'Longitude'}</span>
                                        <input
                                            type="number"
                                            step="any"
                                            value={form[key] ?? ''}
                                            onChange={(event) => updateForm(key, event.target.value)}
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                        />
                                    </label>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold">ยกเลิก</button>
                                <button disabled={isSaving} className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50">
                                    {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
