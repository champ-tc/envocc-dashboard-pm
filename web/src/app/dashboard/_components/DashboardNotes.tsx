'use client';

import { usePathname } from 'next/navigation';
import { useId, useRef } from 'react';

const diseases = [
    'Chronic obstructive pulmonary disease ได้แก่ รหัสที่ขึ้นต้นด้วย J44 ทั้งหมด ยกเว้น J44.2',
    'Acute asthma ได้แก่ รหัสที่ขึ้นต้นด้วย J45 ทั้งหมด รวมไปถึง J44.2',
    'Acute ischemic heart diseases ได้แก่ รหัสที่ขึ้นต้นด้วย I21 และ I24 ทั้งหมด',
    'Subsequent ST elevation (STEMI) and non-ST elevation (NSTEMI) myocardial infarction ได้แก่ รหัสที่ขึ้นต้นด้วย I22 ทั้งหมด',
    'Conjunctivitis ได้แก่ รหัสที่ขึ้นต้นด้วย H10 ทั้งหมด',
    'Eczema ได้แก่ รหัสที่ขึ้นต้นด้วย L30.9 ทั้งหมด',
    'Urticaria ได้แก่ รหัสที่ขึ้นต้นด้วย L50 ทั้งหมด',
];

const airLevels = [
    { range: '0 – 15.0', color: 'bg-sky-500', colorName: 'ฟ้า', meaning: 'ดีมาก', advice: [
        ['ประชาชนทุกคน', ['สามารถดำเนินชีวิตได้ตามปกติ']],
    ] },
    { range: '15.1 – 25.0', color: 'bg-emerald-500', colorName: 'เขียว', meaning: 'ดี', advice: [
        ['ประชาชนทั่วไป', ['สามารถทำกิจกรรมกลางแจ้งได้ตามปกติ']],
        ['ประชาชนกลุ่มเสี่ยง', ['ควรสังเกตอาการผิดปกติ เช่น ไอบ่อย หายใจลำบาก หายใจถี่ หายใจไม่ออก หายใจมีเสียงวี้ด แน่นหน้าอก เจ็บหน้าอก ใจสั่น คลื่นไส้ เมื่อยล้าผิดปกติ หรือ วิงเวียนศีรษะ']],
    ] },
    { range: '25.1 – 37.5', color: 'bg-yellow-400', colorName: 'เหลือง', meaning: 'ปานกลาง', advice: [
        ['ประชาชนทั่วไป', ['ลดระยะเวลาการทำกิจกรรมหรือการออกกำลังกายกลางแจ้งที่ใช้แรงมาก']],
        ['ประชาชนกลุ่มเสี่ยง', ['ใช้อุปกรณ์ป้องกันตนเอง เช่น หน้ากากป้องกัน PM2.5 ทุกครั้งที่ออกนอกอาคาร', 'ลดระยะเวลาการทำกิจกรรมหรือการออกกำลังกายกลางแจ้งที่ใช้แรงมาก', 'หากมีอาการผิดปกติให้รีบปรึกษาแพทย์']],
    ] },
    { range: '37.5 – 75.0', color: 'bg-orange-500', colorName: 'ส้ม', meaning: 'เริ่มมีผลกระทบต่อสุขภาพ', advice: [
        ['ประชาชนทั่วไป', ['ใช้อุปกรณ์ป้องกันตนเอง เช่น หน้ากากป้องกัน PM2.5 ทุกครั้งที่ออกนอกอาคาร', 'จำกัดระยะเวลาในการทำกิจกรรมหรือการออกกำลังกายกลางแจ้งที่ใช้แรงมาก', 'ควรสังเกตอาการผิดปกติ เช่น ไอ หายใจลำบาก ระคายเคืองตา']],
        ['ประชาชนกลุ่มเสี่ยง', ['ใช้อุปกรณ์ป้องกันตนเอง เช่น หน้ากากป้องกัน PM2.5 ทุกครั้งที่ออกนอกอาคาร', 'เลี่ยงการทำกิจกรรมหรือการออกกำลังกายกลางแจ้งที่ใช้แรงมาก', 'ให้ปฏิบัติตามคำแนะนำของแพทย์ หากมีอาการผิดปกติให้รีบไปพบแพทย์']],
    ] },
    { range: '75.1 ขึ้นไป', color: 'bg-red-500', colorName: 'แดง', meaning: 'มีผลกระทบต่อสุขภาพ', advice: [
        ['ประชาชนทุกคน', ['งดกิจกรรมกลางแจ้ง', 'หากมีความจำเป็นต้องทำกิจกรรมกลางแจ้งให้ใช้อุปกรณ์ป้องกันตนเองทุกครั้ง เช่น หน้ากากป้องกัน PM2.5', 'หากมีอาการผิดปกติให้รีบไปพบแพทย์', 'ผู้ที่มีโรคประจำตัว ควรอยู่ในพื้นที่ปลอดภัยจากมลพิษทางอากาศ ให้เตรียมยาและอุปกรณ์ที่จำเป็นให้พร้อมและปฏิบัติตามคำแนะนำของแพทย์อย่างเคร่งครัด']],
    ] },
] satisfies { range: string; color: string; colorName: string; meaning: string; advice: [string, string[]][] }[];

function PatientNotes({ hdc }: { hdc: boolean }) {
    return (
        <ol className="list-decimal space-y-2 pl-5 marker:font-semibold marker:text-neutral">
            <li><p className="font-semibold">รหัส ICD-10 แยกรายโรคดังต่อไปนี้</p>
                <ol className="mt-1 list-decimal divide-y divide-base-300 rounded-xl bg-base-200 pl-8 pr-3 marker:text-neutral">{diseases.map(disease => <li className="py-1 pl-1" key={disease}>{disease}</li>)}</ol>
            </li>
            <li><p className="font-semibold">การนับจำนวนผู้ป่วย{!hdc && ': ตัดซ้ำผู้ป่วยรายคนในแต่ละสัปดาห์'}</p>
                {hdc && <ol className="mt-1 list-decimal pl-5"><li>ผู้ป่วยเฉพาะคนไทย</li><li>ตัดซ้ำผู้ป่วยรายคนในแต่ละสัปดาห์</li></ol>}
            </li>
            <li>คำนวณเป็นปีปฏิทิน</li>
            <li><p>นับสัปดาห์ตามระบาดวิทยา</p><p>(แบบวันอาทิตย์ถึงเสาร์ โดยเริ่มนับวันที่ 1 มกราคม เป็นสัปดาห์ที่ 1 เช่น วันพุธที่ 1 มกราคม จะนับสัปดาห์ที่ 1 แค่วันที่ 1-4 มกราคม เท่านั้น)</p></li>
        </ol>
    );
}

function AirAdvice({ advice }: { advice: [string, string[]][] }) {
    return <div className={`grid gap-2 ${advice.length > 1 ? 'lg:grid-cols-2 lg:gap-4' : ''}`}>{advice.map(([group, items]) => <div key={group}>
        <p className="font-semibold text-neutral">{group} :</p>
        <ul className="list-disc pl-4">{items.map(item => <li key={item}>{item}</li>)}</ul>
    </div>)}</div>;
}

function PMNotes() {
    return (
        <div className="space-y-2">
            <p>1. ฝุ่นละอองขนาดไม่เกิน 2.5 ไมครอน (PM2.5) เป็นฝุ่นที่มีเส้นผ่านศูนย์กลางไม่เกิน 2.5 ไมครอน เกิดจากการเผาไหม้ทั้งจากยานพาหนะ การเผาวัสดุการเกษตร ไฟป่า และกระบวนการอุตสาหกรรม สามารถเข้าไปถึงถุงลมในปอดได้ เป็นผลทำให้เกิดโรคในระบบทางเดินหายใจ และโรคปอดต่างๆ หากได้รับในปริมาณมากหรือเป็นเวลานานจะสะสมในเนื้อเยื่อปอด ทำให้การทำงานของปอดเสื่อมประสิทธิภาพลง ทำให้หลอดลมอักเสบ มีอาการหอบหืด</p>
            <h3 className="font-semibold">2. ระดับของค่าเฉลี่ย 24 ชั่วโมงของฝุ่น PM2.5</h3>
            <div className="space-y-2 md:hidden">{airLevels.map(level => <section key={level.range} className="overflow-hidden rounded-2xl border border-base-300">
                <div className="flex items-start gap-2 bg-base-200 px-3 py-2">
                    <span className={`mt-1 h-5 w-5 shrink-0 rounded-full ${level.color}`} aria-hidden="true" />
                    <div><h4 className="font-semibold text-neutral">{level.range} · {level.meaning}</h4><p className="text-sm">สี{level.colorName}</p></div>
                </div>
                <div className="px-3 py-2 text-sm leading-5"><AirAdvice advice={level.advice} /></div>
            </section>)}</div>
            <div className="hidden overflow-x-auto rounded-2xl border border-base-300 focus-visible:outline-2 focus-visible:outline-neutral md:block" tabIndex={0} role="region" aria-label="ตารางระดับคุณภาพอากาศ เลื่อนแนวนอนเพื่ออ่านทุกคอลัมน์">
                <table className="table w-full min-w-2xl text-sm leading-5 [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1">
                    <caption className="sr-only">ระดับค่าเฉลี่ย 24 ชั่วโมงของฝุ่น PM2.5 สี ความหมาย และข้อควรปฏิบัติ</caption>
                    <thead className="bg-base-200 text-base-content"><tr>
                        <th scope="col" className="w-28 whitespace-normal">ระดับของค่าเฉลี่ย 24 ชั่วโมงของฝุ่น PM2.5</th>
                        <th scope="col">สีที่ใช้</th>
                        <th scope="col" className="w-28 whitespace-normal">ความหมาย (ระดับคุณภาพอากาศ)</th>
                        <th scope="col">ข้อควรปฏิบัติ</th>
                    </tr></thead>
                    <tbody>{airLevels.map(level => <tr key={level.range} className="align-top even:bg-base-200/40">
                        <th scope="row" className="font-semibold whitespace-nowrap">{level.range}</th>
                        <td><span className={`mb-1 block h-5 w-8 rounded border border-black/15 ${level.color}`} aria-hidden="true" />{level.colorName}</td>
                        <td>{level.meaning}</td>
                        <td><AirAdvice advice={level.advice} /></td>
                    </tr>)}</tbody>
                </table>
            </div>
        </div>
    );
}

export default function DashboardNotes() {
    const pathname = usePathname();
    const dialog = useRef<HTMLDialogElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const id = useId();
    const name = ({ '/dashboard/hdc': 'HDC', '/dashboard/dds': 'DDS', '/dashboard/pm25': 'PM2.5' } as Record<string, string>)[pathname];
    if (!name) return null;

    return (
        <>
            <div className="fab bottom-[max(1rem,env(safe-area-inset-bottom))] end-[max(1rem,env(safe-area-inset-right))]">
                <button ref={trigger} type="button" className="btn border-black bg-black text-white hover:border-neutral hover:bg-neutral active:bg-black h-12 min-h-12 cursor-pointer gap-2 rounded-full px-5 shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral motion-reduce:transition-none" aria-haspopup="dialog" aria-controls={id} onClick={() => dialog.current?.showModal()}>
                    <span aria-hidden="true">ⓘ</span> หมายเหตุ
                </button>
            </div>
            <dialog ref={dialog} id={id} className="modal p-3" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onClose={() => trigger.current?.focus()}>
                <div className={`modal-box flex max-h-[calc(100dvh-1.5rem)] w-full ${name === 'PM2.5' ? 'max-w-7xl' : 'max-w-5xl'} flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 p-0 text-left text-base-content shadow-2xl motion-reduce:transition-none`}>
                    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-base-300 px-4 py-2 sm:px-5">
                        <div className="flex items-center gap-3"><h2 id={`${id}-title`} className="text-xl font-semibold text-neutral">หมายเหตุ</h2><span className="badge border-black bg-black px-2 text-xs font-semibold tracking-wide text-white">{name}</span><p id={`${id}-description`} className="sr-only">รายละเอียดประกอบการอ่านข้อมูลแดชบอร์ด {name}</p></div>
                        <button type="button" className="btn btn-circle btn-ghost min-h-11 min-w-11 cursor-pointer bg-base-200 text-neutral hover:bg-base-300" aria-label="ปิดหมายเหตุ" onClick={() => dialog.current?.close()}>✕</button>
                    </header>
                    <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-3 text-sm leading-5 sm:px-5" style={{ scrollbarColor: 'var(--color-base-content) var(--color-base-100)' }} tabIndex={0}>
                        {name === 'PM2.5' ? <PMNotes /> : <PatientNotes hdc={name === 'HDC'} />}
                    </div>
                </div>
                <form method="dialog" noValidate className="modal-backdrop"><button className="cursor-pointer" tabIndex={-1} aria-label="ปิดหมายเหตุจากพื้นหลัง">ปิด</button></form>
            </dialog>
        </>
    );
}
