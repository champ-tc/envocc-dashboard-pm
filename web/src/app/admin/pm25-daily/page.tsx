'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';

import EditablePagination from '@/components/EditablePagination';
import CalendarDatePicker from '@/components/shared/CalendarDatePicker';

type Pollutant = 'pm25' | 'pm10' | 'o3' | 'co' | 'no2' | 'so2';
type Statistic = 'Max' | 'Min' | 'Avg';
type ValueKey = `${Pollutant}${Statistic}`;

type DailyRow = Record<ValueKey, number | null> & {
    air4Date: string;
    stationIdNew: string;
    stationName: string | null;
    province: string | null;
};

type StationOption = {
    stationIdNew: string | null;
    stationName: string | null;
    province: string | null;
};

type DailyForm = Record<ValueKey, string> & {
    stationIdNew: string;
};

const pollutants: { key: Pollutant; label: string }[] = [
    { key: 'pm25', label: 'PM2.5' },
    { key: 'pm10', label: 'PM10' },
    { key: 'o3', label: 'O3' },
    { key: 'co', label: 'CO' },
    { key: 'no2', label: 'NO2' },
    { key: 'so2', label: 'SO2' },
];
const statistics: Statistic[] = ['Max', 'Min', 'Avg'];

function valueKey(pollutant: Pollutant, statistic: Statistic): ValueKey {
    return `${pollutant}${statistic}`;
}

function emptyForm(): DailyForm {
    const form = { stationIdNew: '' } as DailyForm;
    for (const pollutant of pollutants) {
        for (const statistic of statistics) {
            form[valueKey(pollutant.key, statistic)] = '';
        }
    }
    return form;
}

function formatPollutantValue(value: number | null) {
    if (value === null) return '-';
    return Number(value.toFixed(2)).toString();
}

async function getErrorMessage(response: Response) {
    const body = await response.json().catch(() => null);
    return body?.error || 'เกิดข้อผิดพลาดในการดำเนินการ';
}

export default function Pm25DailyManagementPage() {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [rows, setRows] = useState<DailyRow[]>([]);
    const [stations, setStations] = useState<StationOption[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRow, setEditingRow] = useState<DailyRow | null>(null);
    const [form, setForm] = useState<DailyForm>(emptyForm);

    const fetchRows = async () => {
        if (!startDate || !endDate) {
            setRows([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const params = new URLSearchParams({ startDate, endDate });
            const response = await fetch(`/api/admin/pm25-daily?${params}`);
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
    }, [startDate, endDate]);

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
        setForm(emptyForm());
        setIsFormOpen(true);
    };

    const openEditForm = (row: DailyRow) => {
        const nextForm = emptyForm();
        nextForm.stationIdNew = row.stationIdNew;
        for (const pollutant of pollutants) {
            for (const statistic of statistics) {
                nextForm[valueKey(pollutant.key, statistic)] = row[valueKey(pollutant.key, statistic)]?.toString() || '';
            }
        }
        setEditingRow(row);
        setForm(nextForm);
        setIsFormOpen(true);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSaving(true);
        try {
            const response = await fetch('/api/admin/pm25-daily', {
                method: editingRow ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    air4Date: editingRow?.air4Date || startDate,
                    originalAir4Date: editingRow?.air4Date,
                    originalStationIdNew: editingRow?.stationIdNew,
                }),
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

    const handleDelete = async (row: DailyRow) => {
        if (!confirm(`ยืนยันการลบข้อมูล ${row.stationName || row.stationIdNew} วันที่ ${row.air4Date} ใช่หรือไม่?`)) return;
        try {
            const params = new URLSearchParams({ date: row.air4Date, stationIdNew: row.stationIdNew });
            const response = await fetch(`/api/admin/pm25-daily?${params}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(await getErrorMessage(response));
            toast.success('ลบข้อมูลสำเร็จ');
            await fetchRows();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'ไม่สามารถลบข้อมูลได้');
        }
    };

    const exportToCsv = () => {
        if (filteredRows.length === 0) {
            toast.error('ไม่มีข้อมูลที่จะส่งออก');
            return;
        }

        const pollutantHeaders = pollutants.flatMap((pollutant) => statistics.map((statistic) => `${pollutant.label} ${statistic}`));
        const pollutantKeys = pollutants.flatMap((pollutant) => statistics.map((statistic) => valueKey(pollutant.key, statistic)));
        const headers = ['วันที่', 'รหัสสถานี', 'ชื่อสถานี', 'จังหวัด', ...pollutantHeaders];
        const csvRows = filteredRows.map(row => [
            row.air4Date,
            row.stationIdNew,
            row.stationName || '',
            row.province || '',
            ...pollutantKeys.map((key) => row[key] ?? '')
        ]);

        const csvContent = [
            headers.join(','),
            ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `pm25_daily_${startDate}_to_${endDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="auth-page">
            <div className="auth-page-header">
                <div>
                    <h1 className="auth-page-title">จัดการค่าฝุ่นรายวัน</h1>
                    <p className="auth-page-description">เลือกช่วงวันที่เพื่อดู เพิ่ม แก้ไข และลบค่าสรุปรายวัน</p>
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-end">
                    <div className="grid w-full grid-cols-1 gap-3 sm:w-auto sm:grid-cols-2">
                        <CalendarDatePicker label="จากวันที่" value={startDate} onChange={setStartDate} max={endDate || undefined} className="min-w-52" />
                        <CalendarDatePicker label="ถึงวันที่" value={endDate} onChange={setEndDate} min={startDate || undefined} className="min-w-52" />
                    </div>
                    <input disabled={!startDate || !endDate} type="text" placeholder="ค้นหาสถานี จังหวัด หรือรหัส..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 sm:w-72" />
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={exportToCsv} disabled={filteredRows.length === 0} className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:bg-slate-300">
                            <Download className="h-4 w-4" /> Export CSV
                        </button>
                        <button disabled={!startDate || !endDate} onClick={openCreateForm} className="flex-1 sm:flex-none rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">+ เพิ่มข้อมูล</button>
                    </div>
                </div>
            </div>

            <div className="auth-surface overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                <th className="px-5 py-4">วันที่</th>
                                <th className="px-5 py-4">สถานี</th>
                                <th className="px-4 py-4">PM2.5 Max</th>
                                <th className="px-4 py-4">PM2.5 Min</th>
                                <th className="px-4 py-4">PM2.5 Avg</th>
                                <th className="px-5 py-4 text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {!startDate || !endDate ? (
                                <tr><td colSpan={6} className="py-20 text-center text-slate-400">กรุณาเลือกช่วงวันที่จากปฏิทินก่อนแสดงข้อมูลรายวัน</td></tr>
                            ) : isLoading ? (
                                <tr><td colSpan={6} className="py-20 text-center font-bold text-slate-400">กำลังโหลดข้อมูล...</td></tr>
                            ) : displayedRows.length === 0 ? (
                                <tr><td colSpan={6} className="py-20 text-center text-slate-400">ไม่พบข้อมูลในช่วงวันที่เลือก</td></tr>
                            ) : displayedRows.map((row) => (
                                <tr key={`${row.stationIdNew}-${row.air4Date}`} className="hover:bg-slate-50/50">
                                    <td className="px-5 py-4 text-sm font-bold text-blue-600">{row.air4Date}</td>
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-slate-800">{row.stationName || row.stationIdNew}</div>
                                        <div className="text-xs text-slate-400">{row.stationIdNew} {row.province ? `· ${row.province}` : ''}</div>
                                    </td>
                                    <td className="px-4 py-4 text-sm font-bold text-blue-600">{formatPollutantValue(row.pm25Max)}</td>
                                    <td className="px-4 py-4 text-sm text-slate-600">{formatPollutantValue(row.pm25Min)}</td>
                                    <td className="px-4 py-4 text-sm text-slate-600">{formatPollutantValue(row.pm25Avg)}</td>
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
                    <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-800">{editingRow ? 'แก้ไขข้อมูลค่าฝุ่นรายวัน' : 'เพิ่มข้อมูลค่าฝุ่นรายวัน'}</h2>
                            <button onClick={() => setIsFormOpen(false)} className="text-2xl text-slate-400 hover:text-slate-700">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <label className="mb-5 block">
                                <span className="mb-1.5 block text-xs font-bold text-slate-500">สถานี *</span>
                                <select required value={form.stationIdNew} onChange={(event) => setForm({ ...form, stationIdNew: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500">
                                    <option value="">เลือกสถานี</option>
                                    {stations.map((station) => <option key={station.stationIdNew} value={station.stationIdNew || ''}>{station.stationName || station.stationIdNew} {station.province ? `(${station.province})` : ''}</option>)}
                                </select>
                            </label>
                            <div className="space-y-4">
                                {pollutants.map((pollutant) => (
                                    <div key={pollutant.key} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                        <h3 className="mb-3 text-sm font-black text-slate-700">{pollutant.label}</h3>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                            {statistics.map((statistic) => {
                                                const key = valueKey(pollutant.key, statistic);
                                                return (
                                                    <label key={key}>
                                                        <span className="mb-1 block text-xs font-bold text-slate-400">{statistic}</span>
                                                        <input type="number" step="0.01" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
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
