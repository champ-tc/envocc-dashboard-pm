'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarDays } from 'lucide-react';
import EditablePagination from '@/components/EditablePagination';

type HourlyRow = {
    stationIdNew: string;
    stationName: string | null;
    province: string | null;
    air4Time: string;
    pm25: number | null;
    pm10: number | null;
    o3: number | null;
    co: number | null;
    no2: number | null;
    so2: number | null;
};

type StationOption = {
    stationIdNew: string | null;
    stationName: string | null;
    province: string | null;
};

type HourlyForm = {
    stationIdNew: string;
    time: string;
    pm25: string;
    pm10: string;
    o3: string;
    co: string;
    no2: string;
    so2: string;
};

const pollutantFields: { key: keyof Pick<HourlyForm, 'pm25' | 'pm10' | 'o3' | 'co' | 'no2' | 'so2'>; label: string }[] = [
    { key: 'pm25', label: 'PM2.5' },
    { key: 'pm10', label: 'PM10' },
    { key: 'o3', label: 'O3' },
    { key: 'co', label: 'CO' },
    { key: 'no2', label: 'NO2' },
    { key: 'so2', label: 'SO2' },
];

function formatTimeInBangkok(value: string) {
    return new Intl.DateTimeFormat('th-TH', {
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function localTimeValue(value: string) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(new Date(value));
    const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
    return `${part('hour')}:${part('minute')}`;
}

function toBangkokIso(date: string, time: string) {
    return `${date}T${time}:00+07:00`;
}

async function getErrorMessage(response: Response) {
    const body = await response.json().catch(() => null);
    return body?.error || 'เกิดข้อผิดพลาดในการดำเนินการ';
}

export default function Pm25HourlyManagementPage() {
    const [selectedDate, setSelectedDate] = useState('');
    const [rows, setRows] = useState<HourlyRow[]>([]);
    const [stations, setStations] = useState<StationOption[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRow, setEditingRow] = useState<HourlyRow | null>(null);
    const [form, setForm] = useState<HourlyForm>({
        stationIdNew: '',
        time: '00:00',
        pm25: '',
        pm10: '',
        o3: '',
        co: '',
        no2: '',
        so2: '',
    });

    const fetchRows = async () => {
        if (!selectedDate) {
            setRows([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch(`/api/admin/pm25-hourly?date=${encodeURIComponent(selectedDate)}`);
            if (!response.ok) throw new Error(await getErrorMessage(response));
            const data = await response.json();
            setRows(data.rows);
            setCurrentPage(1);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRows();
    }, [selectedDate]);

    useEffect(() => {
        fetch('/api/admin/stations')
            .then(async (response) => {
                if (!response.ok) throw new Error(await getErrorMessage(response));
                return response.json();
            })
            .then((data) => setStations(data.stations.filter((station: StationOption) => station.stationIdNew)))
            .catch((error) => toast.error(error instanceof Error ? error.message : 'ไม่สามารถโหลดข้อมูลสถานีได้'));
    }, []);

    const filteredRows = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return rows;
        return rows.filter((row) => [row.stationIdNew, row.stationName, row.province]
            .some((value) => value?.toLowerCase().includes(query)));
    }, [rows, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
    const displayedRows = filteredRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, itemsPerPage]);

    const openCreateForm = () => {
        setEditingRow(null);
        setForm({ stationIdNew: '', time: '00:00', pm25: '', pm10: '', o3: '', co: '', no2: '', so2: '' });
        setIsFormOpen(true);
    };

    const openEditForm = (row: HourlyRow) => {
        setEditingRow(row);
        setForm({
            stationIdNew: row.stationIdNew,
            time: localTimeValue(row.air4Time),
            pm25: row.pm25?.toString() || '',
            pm10: row.pm10?.toString() || '',
            o3: row.o3?.toString() || '',
            co: row.co?.toString() || '',
            no2: row.no2?.toString() || '',
            so2: row.so2?.toString() || '',
        });
        setIsFormOpen(true);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSaving(true);
        try {
            const payload = {
                ...form,
                air4Time: toBangkokIso(selectedDate, form.time),
                originalStationIdNew: editingRow?.stationIdNew,
                originalAir4Time: editingRow?.air4Time,
            };
            const response = await fetch('/api/admin/pm25-hourly', {
                method: editingRow ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error(await getErrorMessage(response));
            toast.success(editingRow ? 'แก้ไขข้อมูลสำเร็จ' : 'เพิ่มข้อมูลสำเร็จ');
            setIsFormOpen(false);
            await fetchRows();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'ไม่สามารถบันทึกข้อมูลได้');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (row: HourlyRow) => {
        if (!confirm(`ยืนยันการลบข้อมูล ${row.stationName || row.stationIdNew} เวลา ${formatTimeInBangkok(row.air4Time)} น. ใช่หรือไม่?`)) return;
        try {
            const params = new URLSearchParams({ stationIdNew: row.stationIdNew, air4Time: row.air4Time });
            const response = await fetch(`/api/admin/pm25-hourly?${params}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(await getErrorMessage(response));
            toast.success('ลบข้อมูลสำเร็จ');
            await fetchRows();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'ไม่สามารถลบข้อมูลได้');
        }
    };

    return (
        <div className="w-full">
            <div className="flex flex-col gap-4 mb-8 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">จัดการค่าฝุ่นรายชั่วโมง</h1>
                    <p className="text-slate-500 font-medium">เลือกวันที่หนึ่งวันเพื่อดู เพิ่ม แก้ไข และลบข้อมูลรายชั่วโมง</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <label className="flex min-w-64 cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all hover:border-blue-400 hover:shadow-md focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
                        <CalendarDays className="h-5 w-5 shrink-0 text-blue-600" />
                        <span className="flex-1">
                            <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">วันที่ข้อมูล</span>
                            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="w-full cursor-pointer bg-transparent text-sm font-black text-slate-700 outline-none" aria-label="เลือกวันที่" />
                        </span>
                    </label>
                    <input disabled={!selectedDate} type="text" placeholder="ค้นหาสถานี จังหวัด หรือรหัส..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="w-full sm:w-72 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100" />
                    <button disabled={!selectedDate} onClick={openCreateForm} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">+ เพิ่มข้อมูล</button>
                </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px] text-left">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                <th className="px-5 py-4">เวลา</th>
                                <th className="px-5 py-4">สถานี</th>
                                {pollutantFields.map((field) => <th key={field.key} className="px-4 py-4">{field.label}</th>)}
                                <th className="px-5 py-4 text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {!selectedDate ? (
                                <tr><td colSpan={9} className="py-20 text-center text-slate-400">กรุณาเลือกวันที่จากปฏิทินก่อนแสดงข้อมูลรายชั่วโมง</td></tr>
                            ) : isLoading ? (
                                <tr><td colSpan={9} className="py-20 text-center font-bold text-slate-400">กำลังโหลดข้อมูล...</td></tr>
                            ) : displayedRows.length === 0 ? (
                                <tr><td colSpan={9} className="py-20 text-center text-slate-400">ไม่พบข้อมูลในวันที่เลือก</td></tr>
                            ) : displayedRows.map((row) => (
                                <tr key={`${row.stationIdNew}-${row.air4Time}`} className="hover:bg-slate-50/50">
                                    <td className="px-5 py-4 text-sm font-bold text-blue-600">{formatTimeInBangkok(row.air4Time)} น.</td>
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-slate-800">{row.stationName || row.stationIdNew}</div>
                                        <div className="text-xs text-slate-400">{row.stationIdNew} {row.province ? `· ${row.province}` : ''}</div>
                                    </td>
                                    {pollutantFields.map((field) => <td key={field.key} className="px-4 py-4 text-sm text-slate-600">{row[field.key] ?? '-'}</td>)}
                                    <td className="px-5 py-4">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => openEditForm(row)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-100">แก้ไข</button>
                                            <button onClick={() => handleDelete(row)} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100">ลบ</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {!isLoading && filteredRows.length > 0 && (
                    <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/50 px-6 py-4 lg:flex-row">
                        <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-slate-400 lg:justify-start">
                            <span>แสดง {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredRows.length)} จาก {filteredRows.length} รายการ</span>
                            <label className="flex items-center gap-2">
                                <span>ต่อหน้า</span>
                                <select value={itemsPerPage} onChange={(event) => setItemsPerPage(Number(event.target.value))} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-600 outline-none">
                                    {[20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                                </select>
                            </label>
                        </div>
                        <EditablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </div>
                )}
            </div>

            {isFormOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-800">{editingRow ? 'แก้ไขข้อมูลค่าฝุ่น' : 'เพิ่มข้อมูลค่าฝุ่น'}</h2>
                            <button onClick={() => setIsFormOpen(false)} className="text-2xl text-slate-400 hover:text-slate-700">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <label className="block md:col-span-2">
                                    <span className="mb-1.5 block text-xs font-bold text-slate-500">สถานี *</span>
                                    <select required value={form.stationIdNew} onChange={(event) => setForm({ ...form, stationIdNew: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500">
                                        <option value="">เลือกสถานี</option>
                                        {stations.map((station) => <option key={station.stationIdNew} value={station.stationIdNew || ''}>{station.stationName || station.stationIdNew} {station.province ? `(${station.province})` : ''}</option>)}
                                    </select>
                                </label>
                                <label className="block md:col-span-2">
                                    <span className="mb-1.5 block text-xs font-bold text-slate-500">เวลาในวันที่ {selectedDate} *</span>
                                    <input required type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
                                </label>
                                {pollutantFields.map((field) => (
                                    <label key={field.key} className="block">
                                        <span className="mb-1.5 block text-xs font-bold text-slate-500">{field.label}</span>
                                        <input type="number" step="any" value={form[field.key]} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
                                    </label>
                                ))}
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-600">ยกเลิก</button>
                                <button disabled={isSaving} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{isSaving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
