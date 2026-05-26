'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    ChevronLeft, UserPlus, ShieldCheck, CheckCircle2,
    User, Phone, Mail, CreditCard, Briefcase,
    Eye, EyeOff, Lock
} from 'lucide-react';
import { WORKPLACE_TYPES, DDC_REGIONS, PERSONNEL_TYPES } from '@/lib/constants';

// --- Types & Interfaces ---
interface LocationData {
    provinces: any[];
    amphures: any[];
    districts: any[];
}

// --- UI Components ---
const SectionTitle = ({ icon: Icon, num, title }: { icon: any, num: string, title: string }) => (
    <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-200">
            {num}
        </div>
        <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-black text-slate-800 tracking-tight">{title}</h2>
        </div>
    </div>
);

const FormInput = ({ label, icon: Icon, ...props }: any) => (
    <div className="form-control w-full">
        <label className="label px-1">
            <span className="label-text font-bold text-slate-600 uppercase tracking-wider text-[10px]">{label}</span>
        </label>
        <div className="relative group">
            {Icon && (
                <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            )}
            <input
                {...props}
                className={`input input-bordered w-full ${Icon ? 'pl-11' : 'pl-4'} bg-white border-slate-200 focus:border-blue-500 text-slate-800 rounded-xl transition-all h-12 text-sm`}
            />
        </div>
    </div>
);

const FormSelect = ({ label, options, ...props }: any) => (
    <div className="form-control w-full">
        <label className="label px-1">
            <span className="label-text font-bold text-slate-600 uppercase tracking-wider text-[10px]">{label}</span>
        </label>
        <select
            {...props}
            className="select select-bordered w-full bg-white border-slate-200 focus:border-blue-500 text-slate-800 rounded-xl transition-all h-12 text-sm"
        >
            {options}
        </select>
    </div>
);

// --- Validation Logic ---
const validateIdCard = (id: string) => {
    if (id.length !== 13) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(id.charAt(i)) * (13 - i);
    }
    return ((11 - (sum % 11)) % 10) === parseInt(id.charAt(12));
};

// --- Main Page Component ---
export default function RegisterPage() {
    const router = useRouter();

    // Form Data State
    const [form, setForm] = useState({
        prefix: '', name: '', phone: '', email: '', idCard: '', username: '', password: '',
        province: '', district: '', subDistrict: '',
        workplaceType: '', workplace: '', personnelType: '', position: '', level: '',
        workplaceProvince: '', ddcRegion: ''
    });

    // Location Data State
    const [location, setLocation] = useState<LocationData>({ provinces: [], amphures: [], districts: [] });
    const [filtered, setFiltered] = useState({ amphures: [] as any[], tambons: [] as any[] });

    // UI State
    const [ui, setUi] = useState({
        loading: false, checking: false, modal: false, pdpa: true,
        showPass: false, otherPrefix: false, otherPos: false
    });

    // Fetch initial location data
    useEffect(() => {
        fetch('/data/data.json')
            .then(res => res.json())
            .then(setLocation)
            .catch(() => toast.error('ไม่สามารถโหลดข้อมูลพื้นที่ได้'));
    }, []);

    // --- Event Handlers ---
    const handleInputChange = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleProvinceChange = (name: string) => {
        handleInputChange('province', name);
        handleInputChange('district', '');
        handleInputChange('subDistrict', '');

        const prov = location.provinces.find(p => p.name_th === name);
        setFiltered({
            amphures: prov ? location.amphures.filter(a => a.province_id === prov.id) : [],
            tambons: []
        });
    };

    const handleAmphureChange = (name: string) => {
        handleInputChange('district', name);
        handleInputChange('subDistrict', '');

        const amp = filtered.amphures.find(a => a.name_th === name);
        setFiltered(prev => ({
            ...prev,
            tambons: amp ? location.districts.filter(t => t.amphure_id === amp.id) : []
        }));
    };

    const handlePreSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Client-side validations
        if (!validateIdCard(form.idCard)) {
            return toast.error('เลขบัตรประชาชนไม่ถูกต้อง');
        }
        if (!/^0\d{9}$/.test(form.phone)) {
            return toast.error('เบอร์โทรศัพท์ไม่ถูกต้อง');
        }

        setUi(prev => ({ ...prev, checking: true }));

        // Pre-flight check for duplicates
        try {
            const res = await fetch('/api/auth/check-duplicate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: form.username,
                    email: form.email,
                    idCard: form.idCard
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'พบข้อมูลซ้ำในระบบ');
            }

            setUi(prev => ({ ...prev, checking: false, modal: true }));
        } catch (err: any) {
            toast.error(err.message);
            setUi(prev => ({ ...prev, checking: false }));
        }
    };

    const handleRegister = async () => {
        setUi(prev => ({ ...prev, loading: true, modal: false }));

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'การลงทะเบียนล้มเหลว');
            }

            toast.success('สมัครสมาชิกสำเร็จ! กรุณารอการอนุมัติ');
            router.push('/login');
        } catch (err: any) {
            toast.error(err.message);
            setUi(prev => ({ ...prev, loading: false }));
        }
    };

    const activeWp = useMemo(() => WORKPLACE_TYPES.find(w => w.label === form.workplaceType), [form.workplaceType]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-200 text-slate-900 relative overflow-hidden">

            {/* Background */}
            <div className="absolute inset-0 z-0 bg-cover bg-center bg-fixed opacity-40 pointer-events-none"
                style={{ backgroundImage: "url('/img/background.jpg')" }} />
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-0 pointer-events-none" />

            {/* Back Button */}
            <div className="absolute top-6 left-6 z-50">
                <Link href="/" className="flex items-center gap-2 px-5 py-2.5 bg-white/90 backdrop-blur-xl border border-white/50 rounded-full shadow-sm hover:shadow-md transition-all text-slate-700 font-bold group">
                    <ChevronLeft className="w-5 h-5 group-hover:text-blue-600" />
                    <span className="hidden xs:inline">กลับหน้าหลัก</span>
                </Link>
            </div>

            {/* Main Content */}
            <div className="z-10 w-full max-w-6xl mx-auto px-4 pt-28 pb-20 relative">
                <form onSubmit={handlePreSubmit} className="card bg-white/85 backdrop-blur-2xl shadow-2xl border border-white/50 rounded-[3rem] overflow-hidden">
                    <div className="card-body p-8 md:p-16">

                        {/* Header */}
                        <div className="text-center mb-12">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-linear-to-br from-blue-600 to-sky-400 text-white shadow-xl shadow-blue-500/20 mb-6 transform hover:rotate-3 transition-transform duration-500">
                                <UserPlus className="w-10 h-10" />
                            </div>
                            <h1 className="text-4xl font-black tracking-tight text-slate-800">สมัครสมาชิกใหม่</h1>
                            <p className="text-slate-500 font-medium mt-3">กรุณากรอกข้อมูลให้ครบถ้วนเพื่อการตรวจสอบและอนุมัติที่รวดเร็ว</p>
                        </div>

                        {/* Two Columns Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-10">

                            {/* Left Column: Personal Info */}
                            <div className="space-y-6">
                                <SectionTitle icon={User} num="1" title="ข้อมูลส่วนตัว" />

                                <div className="grid grid-cols-3 gap-4">
                                    <FormSelect
                                        label="คำนำหน้า"
                                        value={ui.otherPrefix ? 'อื่นๆ' : form.prefix}
                                        onChange={(e: any) => {
                                            const val = e.target.value;
                                            setUi({ ...ui, otherPrefix: val === 'อื่นๆ' });
                                            handleInputChange('prefix', val === 'อื่นๆ' ? '' : val);
                                        }}
                                        options={
                                            <>
                                                <option value="">เลือก</option>
                                                <option value="นาย">นาย</option>
                                                <option value="นาง">นาง</option>
                                                <option value="นางสาว">นางสาว</option>
                                                <option value="อื่นๆ">อื่นๆ</option>
                                            </>
                                        }
                                    />
                                    <div className="col-span-2">
                                        <FormInput
                                            label="ชื่อ-นามสกุล"
                                            placeholder="กรอกชื่อและนามสกุล"
                                            required
                                            value={form.name}
                                            onChange={(e: any) => handleInputChange('name', e.target.value)}
                                        />
                                    </div>
                                </div>

                                {ui.otherPrefix && (
                                    <FormInput
                                        placeholder="ระบุคำนำหน้าอื่นๆ"
                                        required
                                        value={form.prefix}
                                        onChange={(e: any) => handleInputChange('prefix', e.target.value)}
                                    />
                                )}

                                <FormInput
                                    label="เลขบัตรประชาชน"
                                    icon={CreditCard}
                                    maxLength={13}
                                    placeholder="เลข 13 หลัก"
                                    required
                                    value={form.idCard}
                                    onChange={(e: any) => handleInputChange('idCard', e.target.value.replace(/\D/g, ''))}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormInput
                                        label="เบอร์โทรศัพท์"
                                        icon={Phone}
                                        maxLength={10}
                                        placeholder="08xxxxxxxx"
                                        required
                                        value={form.phone}
                                        onChange={(e: any) => handleInputChange('phone', e.target.value.replace(/\D/g, ''))}
                                    />
                                    <FormInput
                                        label="อีเมล"
                                        icon={Mail}
                                        type="email"
                                        placeholder="example@mail.com"
                                        required
                                        value={form.email}
                                        onChange={(e: any) => handleInputChange('email', e.target.value)}
                                    />
                                </div>

                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                                    <FormInput
                                        label="ชื่อผู้ใช้งาน (Username)"
                                        placeholder="ตั้งชื่อผู้ใช้งาน (ภาษาอังกฤษ/ตัวเลข)"
                                        minLength={5}
                                        required
                                        value={form.username}
                                        onChange={(e: any) => handleInputChange('username', e.target.value)}
                                    />
                                    <div className="relative group">
                                        <FormInput
                                            label="รหัสผ่าน (Password)"
                                            type={ui.showPass ? "text" : "password"}
                                            minLength={12}
                                            placeholder="รหัสผ่าน 12 ตัวอักษรขึ้นไป"
                                            required
                                            value={form.password}
                                            onChange={(e: any) => handleInputChange('password', e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setUi({ ...ui, showPass: !ui.showPass })}
                                            className="absolute right-4 bottom-3.5 text-slate-400 hover:text-blue-500 transition-colors"
                                        >
                                            {ui.showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 px-1">รหัสผ่านต้องมีอักษรพิมพ์ใหญ่ พิมพ์เล็ก และตัวเลขอย่างน้อย 1 ตัว</p>
                                </div>
                            </div>

                            {/* Right Column: Work Info */}
                            <div className="space-y-6">
                                <SectionTitle icon={Briefcase} num="2" title="ข้อมูลสถานที่ทำงาน" />

                                <FormSelect
                                    label="สังกัด/ประเภทสถานที่ทำงาน"
                                    value={form.workplaceType}
                                    onChange={(e: any) => {
                                        handleInputChange('workplaceType', e.target.value);
                                        handleInputChange('workplace', '');
                                        handleInputChange('ddcRegion', '');
                                        handleInputChange('workplaceProvince', '');
                                    }}
                                    options={
                                        <>
                                            <option value="">เลือกสังกัด</option>
                                            {WORKPLACE_TYPES.map(w => <option key={w.label} value={w.label}>{w.label}</option>)}
                                        </>
                                    }
                                />

                                {activeWp?.requireName && (
                                    <FormInput
                                        label="ชื่อสถานที่ทำงาน"
                                        placeholder="ระบุหน่วยงาน/โรงพยาบาล"
                                        required
                                        value={form.workplace}
                                        onChange={(e: any) => handleInputChange('workplace', e.target.value)}
                                    />
                                )}

                                {activeWp?.requireProvince && (
                                    <FormSelect
                                        label="จังหวัด (ที่ทำงาน)"
                                        value={form.workplaceProvince}
                                        onChange={(e: any) => handleInputChange('workplaceProvince', e.target.value)}
                                        options={
                                            <>
                                                <option value="">เลือกจังหวัด</option>
                                                {location.provinces.map(p => <option key={p.id} value={p.name_th}>{p.name_th}</option>)}
                                            </>
                                        }
                                    />
                                )}

                                {activeWp?.requireDdcRegion && (
                                    <FormSelect
                                        label="สำนักงานเขต (สคร.)"
                                        value={form.ddcRegion}
                                        onChange={(e: any) => handleInputChange('ddcRegion', e.target.value)}
                                        options={
                                            <>
                                                <option value="">เลือก สคร.</option>
                                                {DDC_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                            </>
                                        }
                                    />
                                )}

                                <div className="grid grid-cols-3 gap-3">
                                    <FormSelect
                                        label="จังหวัด"
                                        value={form.province}
                                        onChange={(e: any) => handleProvinceChange(e.target.value)}
                                        options={<><option value="">เลือก</option>{location.provinces.map(p => <option key={p.id} value={p.name_th}>{p.name_th}</option>)}</>}
                                    />
                                    <FormSelect
                                        label="เขต/อำเภอ"
                                        value={form.district}
                                        disabled={!form.province}
                                        onChange={(e: any) => handleAmphureChange(e.target.value)}
                                        options={<><option value="">เลือก</option>{filtered.amphures.map(a => <option key={a.id} value={a.name_th}>{a.name_th}</option>)}</>}
                                    />
                                    <FormSelect
                                        label="ตำบล"
                                        value={form.subDistrict}
                                        disabled={!form.district}
                                        onChange={(e: any) => handleInputChange('subDistrict', e.target.value)}
                                        options={<><option value="">เลือก</option>{filtered.tambons.map(t => <option key={t.id} value={t.name_th}>{t.name_th}</option>)}</>}
                                    />
                                </div>

                                <div className="space-y-4 pt-4 border-t border-slate-100">
                                    <FormSelect
                                        label="ประเภทบุคลากร"
                                        value={form.personnelType}
                                        onChange={(e: any) => {
                                            handleInputChange('personnelType', e.target.value);
                                            handleInputChange('level', '');
                                        }}
                                        options={<><option value="">เลือกประเภท</option>{PERSONNEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</>}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormSelect
                                            label="ตำแหน่ง"
                                            value={ui.otherPos ? 'อื่นๆ' : form.position}
                                            onChange={(e: any) => {
                                                const val = e.target.value;
                                                setUi({ ...ui, otherPos: val === 'อื่นๆ' });
                                                handleInputChange('position', val === 'อื่นๆ' ? '' : val);
                                            }}
                                            options={
                                                <>
                                                    <option value="">เลือกตำแหน่ง</option>
                                                    <option value="นายแพทย์">นายแพทย์</option>
                                                    <option value="พยาบาลวิชาชีพ">พยาบาลวิชาชีพ</option>
                                                    <option value="นักวิชาการสาธารณสุข">นักวิชาการสาธารณสุข</option>
                                                    <option value="อื่นๆ">อื่นๆ</option>
                                                </>
                                            }
                                        />

                                        {form.personnelType === 'ข้าราชการ' && (
                                            <FormSelect
                                                label="ระดับ"
                                                value={form.level}
                                                onChange={(e: any) => handleInputChange('level', e.target.value)}
                                                options={
                                                    <>
                                                        <option value="">เลือก</option>
                                                        <option value="ปฏิบัติการ">ปฏิบัติการ</option>
                                                        <option value="ชำนาญการ">ชำนาญการ</option>
                                                        <option value="ชำนาญการพิเศษ">ชำนาญการพิเศษ</option>
                                                    </>
                                                }
                                            />
                                        )}
                                    </div>

                                    {ui.otherPos && (
                                        <FormInput
                                            placeholder="ระบุตำแหน่งงานอื่นๆ"
                                            required
                                            value={form.position}
                                            onChange={(e: any) => handleInputChange('position', e.target.value)}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Submit Section */}
                        <div className="mt-16 flex flex-col items-center gap-6">
                            <button
                                type="submit"
                                disabled={ui.loading || ui.checking}
                                className="btn w-full max-w-md h-14 bg-linear-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white border-none rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:-translate-y-1 transition-all text-lg"
                            >
                                {ui.checking ? <span className="loading loading-spinner" /> : 'ลงทะเบียนเข้าใช้งาน'}
                            </button>
                            <p className="text-slate-500 font-medium text-sm">
                                มีบัญชีอยู่แล้ว?
                                <Link href="/login" className="link link-primary font-black ml-2 text-blue-600">เข้าสู่ระบบที่นี่</Link>
                            </p>
                        </div>
                    </div>
                </form>
            </div>

            {/* Modals */}
            {ui.pdpa && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl bg-white rounded-[2rem] p-8 shadow-2xl">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                            <ShieldCheck className="w-8 h-8 text-blue-600" />
                            <h3 className="font-black text-2xl text-slate-800">นโยบายความเป็นส่วนตัว (PDPA)</h3>
                        </div>
                        <div className="py-2 space-y-4 text-slate-600 text-sm leading-relaxed max-h-[50vh] overflow-y-auto pr-4">
                            <p className="font-bold text-slate-700">วัตถุประสงค์ในการเก็บรวบรวมข้อมูลส่วนบุคคล</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>เพื่อตรวจสอบและยืนยันตัวตนของผู้ใช้งานระบบฐานข้อมูล</li>
                                <li>เพื่อใช้ในการติดต่อประสานงานกรณีพบข้อมูลที่ผิดปกติหรือต้องการสอบถามเพิ่มเติม</li>
                                <li>เพื่อกำหนดสิทธิ์การเข้าถึงข้อมูลตามบทบาทและพื้นที่ที่รับผิดชอบ</li>
                            </ul>
                            <p className="font-bold text-slate-700 mt-4">การรักษาความปลอดภัย</p>
                            <p>ระบบจะเก็บรักษาข้อมูลของท่านไว้เป็นความลับ และจะไม่มีการเปิดเผยข้อมูลส่วนบุคคลต่อสาธารณะหรือบุคคลที่สามโดยไม่ได้รับอนุญาต</p>
                        </div>
                        <div className="modal-action gap-3 mt-8">
                            <button onClick={() => router.push('/')} className="btn btn-ghost rounded-xl px-8 font-bold">ไม่ยินยอม</button>
                            <button onClick={() => setUi({ ...ui, pdpa: false })} className="btn btn-primary rounded-xl px-10 font-bold shadow-lg shadow-blue-500/20">ยินยอมและรับทราบ</button>
                        </div>
                    </div>
                </div>
            )}

            {ui.modal && (
                <div className="modal modal-open">
                    <div className="modal-box rounded-[2rem] p-10 text-center bg-white shadow-2xl">
                        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
                        <h3 className="font-black text-2xl text-slate-800 mb-4">ยืนยันข้อมูลการลงทะเบียน?</h3>
                        <p className="text-slate-500 mb-8 text-sm">ข้อมูลจะถูกส่งไปยังผู้ดูแลระบบเพื่อตรวจสอบและอนุมัติการใช้งาน <br />โปรดตรวจสอบความถูกต้องของข้อมูลก่อนยืนยัน</p>
                        <div className="flex gap-4 justify-center">
                            <button onClick={() => setUi({ ...ui, modal: false })} className="btn btn-ghost px-8 rounded-xl font-bold">กลับไปแก้ไข</button>
                            <button onClick={handleRegister} disabled={ui.loading} className="btn btn-primary px-10 rounded-xl font-bold shadow-lg shadow-blue-500/20">
                                {ui.loading ? <span className="loading loading-spinner" /> : 'ยืนยันสมัครสมาชิก'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
