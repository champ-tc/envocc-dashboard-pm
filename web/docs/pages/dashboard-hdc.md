# Dashboard HDC — `/dashboard/hdc`

## ตัวกรองและเงื่อนไข

- [ ] ช่วงวันที่เริ่มต้น/สิ้นสุด
- [ ] เขตสุขภาพ, จังหวัด, อำเภอ และตำบลตาม options/hierarchy
- [ ] โรคและประเภทการวินิจฉัย
- [ ] dependency เขต → จังหวัด และการล้างระดับล่างเมื่อเลือกค่าระดับบนยังถูกต้อง
- [ ] role scope ของ `admin_region`/`admin_province` ยังบังคับใช้
- [ ] ตัวกรอง HDC แยกจาก dashboard อื่น และ serialize/restore ผ่าน URL

## ผลลัพธ์ที่ต้อง sync กับ filter

- [ ] แผนที่จำนวนผู้ป่วยรายจังหวัดและ popup
- [ ] disease cards/สถิติ top 5
- [ ] กราฟรายเดือนผู้ป่วยและค่าเฉลี่ย PM2.5
- [ ] legend, tooltip และปุ่ม export

## Shared map/background/EnvOcc rules

- [ ] แผนที่ใช้ boundary, province key, สี, legend, popup และการแสดงพื้นที่ตามมาตรฐานกลาง
- [ ] ข้อมูลแผนที่ต้องมาจาก filter HDC ชุดเดียวกับ disease cards และกราฟ
- [ ] พื้นหลัง dashboard และ layering ของแผนที่ยังอยู่ครบใน desktop/mobile
- [ ] รหัสโรค/ประเภทการวินิจฉัย EnvOcc ต้องตรงตาม พ.ร.บ. และ mapping เดียวกับ DDS; ห้ามตัดรหัสที่ยังถูกใช้งาน

## ตรวจรับ

- [ ] ผู้ใช้เห็นเฉพาะข้อมูลตาม scope เดิม
- [ ] Refresh/Back/Forward/เปิด URL เดิมคืนค่าเดิม
- [ ] error/empty/loading ไม่ reset filter

