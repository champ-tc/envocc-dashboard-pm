# AI Change Checklist — EnvOcc Dashboard

ใช้ไฟล์นี้ทุกครั้งก่อนและหลังให้ AI แก้หน้าเว็บ ห้ามถือว่าการ build ผ่านเพียงอย่างเดียวแปลว่าเงื่อนไขเดิมยังอยู่

## กติกากลาง

- [ ] แก้เฉพาะ scope ที่ระบุ ไม่ลบ component, route, action, API หรือ data field ที่ไม่ได้อยู่ใน scope
- [ ] อ่านเอกสารของหน้าที่จะแก้ก่อนเริ่ม และอัปเดตเอกสารเมื่อ behavior เปลี่ยนโดยตั้งใจ
- [ ] ตัวกรองของ PM2.5, DDS และ HDC แยก state และแยก URL/query กัน
- [ ] ตัวกรองทุกตัวอยู่ใน URL/query ที่อ่านกลับได้ และ URL ที่แชร์ให้ผลลัพธ์เดียวกัน
- [ ] Refresh, Back/Forward และเปิด URL เดิมใหม่ต้องคืนค่าตัวกรองเดิม
- [ ] เปลี่ยนตัวกรองแล้วแผนที่ กราฟ ตาราง ตัวเลขสรุป ranking และ export ใช้ filter ชุดเดียวกัน
- [ ] ห้าม reset ตัวกรองเมื่อ loading, empty, error, retry หรือ data fetch ล้มเหลว
- [ ] ห้ามข้าม role/scope ของผู้ใช้เพื่อแสดงข้อมูลนอกสิทธิ์
- [ ] เก็บ loading, empty, error, retry และ race-condition protection ไว้
- [ ] รักษา responsive layout, ภาษาไทย, accessibility label และ keyboard interaction

## Shared visual/data invariants

- [ ] ระบบแผนที่ใช้ component, boundary data, area key, สี, legend, tooltip และระดับการแสดงผลตามมาตรฐานเดิม
- [ ] ก่อนแก้แผนที่ต้องตรวจทุก consumer ของ `ThailandMap`/map utilities และทดสอบ PM2.5, DDS, HDC ที่ได้รับผลกระทบ
- [ ] filter ที่ใช้กับแผนที่ต้องตรงกับ filter ที่ใช้คำนวณ cards, chart, ranking และ popup
- [ ] ห้ามเปลี่ยนหรือลบรหัสโรค/ชื่อโรค EnvOcc ที่อ้างอิงตาม พ.ร.บ. โดยไม่ตรวจ source of truth และเอกสารกำกับ
- [ ] รหัสโรค, diagnosis type, label ภาษาไทย และ mapping ต้องส่งผ่าน API/query/data transformation ครบถึงผลลัพธ์ปลายทาง
- [ ] พื้นหลังหน้าเว็บและ visual identity (`OpenSkyBackground`/background assets) ต้องคงอยู่ในหน้าที่ใช้งานอยู่
- [ ] การเปลี่ยนพื้นหลังต้องตรวจ contrast, z-index, overlay, loading/error state และ responsive ทุกหน้าที่ใช้ร่วมกัน
- [ ] ห้ามแทนที่ map/background/EnvOcc mapping ด้วย placeholder หรือค่า hard-coded ชั่วคราวในโค้ด production

## ตรวจหลังแก้

- [ ] `npm run lint` หรือคำสั่งตรวจสอบของโปรเจกต์ทำงานได้ (ข้อผิดพลาดเดิมต้องแยกจากของใหม่)
- [ ] ทดสอบทุก filter ที่เพิ่ม/แก้ และทดสอบค่าหลายรายการกับค่า “ทั้งหมด”
- [ ] ทดสอบ refresh, Back/Forward, เปิด URL ใหม่ และสลับ dashboard
- [ ] ทดสอบ error/empty/loading โดยยืนยันว่า filter ไม่ถูกล้าง
- [ ] ทดสอบ desktop และ mobile
- [ ] ตรวจ diff ว่าไม่มีการลบเงื่อนไขหรือ fallback โดยไม่ตั้งใจ
- [ ] ถ้าแก้ shared component/data mapping ให้ตรวจ checklist ของทุกหน้าที่ใช้สิ่งนั้น ไม่ใช่เฉพาะหน้าที่เปิดแก้

