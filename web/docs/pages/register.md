# Register — `/register`

## กติกาก่อนแก้ไข

ต้องอ่านไฟล์นี้และ `web/AGENTS.md` ก่อนแก้ `web/src/app/register/` ทุกครั้ง หากเปลี่ยน behavior หรือ visual contract ต้องอัปเดตไฟล์นี้ใน change เดียวกัน

## สิ่งที่ต้องคงไว้

- [ ] ฟอร์มข้อมูลส่วนตัว, ติดต่อ, บัญชี, ที่ทำงาน และพื้นที่ยังครบ
- [ ] dropdown จังหวัด → อำเภอ → ตำบลเป็น dependent และ reset เฉพาะค่าระดับล่างที่เกี่ยวข้อง
- [ ] workplace type, personnel type, ตำแหน่ง, ระดับ และ DDC region ยังอยู่
- [ ] ผู้สมัครเลือกประเภท `user_general`, `user_region`, `user_province` หรือ `user_envocc` ได้
- [ ] บัญชีใหม่บันทึกเป็นสถานะ `pending` ระหว่างทดสอบระบบ
- [ ] validation เลขบัตรประชาชน 13 หลักและเบอร์โทรศัพท์ 10 หลักยังอยู่
- [ ] pre-flight duplicate check username/email/idCard ยังอยู่
- [ ] PDPA/confirmation modal และ show/hide password ยังอยู่
- [ ] loading/checking ป้องกัน submit ซ้ำ และ error ไม่ล้างค่าฟอร์ม
- [ ] submit สำเร็จ redirect/feedback ตาม behavior เดิม
- [ ] พื้นหลัง `OpenSkyBackground`, card และ layering ยังอยู่ครบทุก viewport

## ตรวจรับ

- [ ] โหลด `/data/data.json` สำเร็จและมี fallback เมื่อโหลดไม่ได้
- [ ] ทดสอบ validation รายช่องและ duplicate response
- [ ] ทดสอบย้อนกลับ/refresh ตาม behavior ที่กำหนดโดยไม่ทำให้ flow เสีย
- [ ] ตรวจว่าข้อมูลส่วนตัวไม่ถูกใส่ใน URL หรือ log

