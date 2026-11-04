# Register — `/register`

## สิ่งที่ต้องคงไว้

- [ ] ฟอร์มข้อมูลส่วนตัว, ติดต่อ, บัญชี, ที่ทำงาน และพื้นที่ยังครบ
- [ ] dropdown จังหวัด → อำเภอ → ตำบลเป็น dependent และ reset เฉพาะค่าระดับล่างที่เกี่ยวข้อง
- [ ] workplace type, personnel type, ตำแหน่ง, ระดับ และ DDC region ยังอยู่
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

