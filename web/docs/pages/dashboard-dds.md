# Dashboard DDS — `/dashboard/dds`

## ตัวกรองและเงื่อนไข

- [ ] ช่วงวันที่เริ่มต้น/สิ้นสุด
- [ ] เขตสุขภาพและจังหวัด พร้อมการเลือกหลายรายการ/ค้นหาจังหวัด
- [ ] อำเภอ/พื้นที่ที่เกี่ยวข้อง (ถ้ามีใน options) ไม่ถูกตัดออก
- [ ] ประเภทการวินิจฉัยและโรค/รหัสโรคยังอยู่ รวม custom Z581
- [ ] ตัวกรอง DDS แยกจาก PM2.5/HDC และ serialize/restore ผ่าน URL

## ผลลัพธ์ที่ต้อง sync กับ filter

- [ ] แผนที่/ข้อมูลพื้นที่
- [ ] cards สรุปโรคและจำนวนผู้ป่วย
- [ ] กราฟแนวโน้มรายเดือน จำนวนผู้ป่วย และค่าเฉลี่ย PM2.5
- [ ] tooltip, legend และปุ่ม export กราฟ

## Shared map/background/EnvOcc rules

- [ ] ถ้ามีแผนที่ ต้องใช้ map component, boundary, สี, legend และ popup มาตรฐานเดียวกับ dashboard อื่น
- [ ] พื้นที่บนแผนที่ต้องตรงกับ filter DDS และข้อมูล cards/กราฟ ไม่ใช้ข้อมูลชุดเก่าหลังเปลี่ยน filter
- [ ] พื้นหลัง dashboard/visual layer ยังอยู่ครบและไม่บดบัง filter, map หรือ tooltip
- [ ] รหัสโรคและชื่อโรค EnvOcc ต้องคงตาม mapping ที่อ้างอิง พ.ร.บ.; ห้ามเปลี่ยน label เพื่อให้ตรงกับข้อมูลชั่วคราวโดยไม่มีการยืนยัน

## ตรวจรับ

- [ ] เปลี่ยน filter แล้วไม่มีข้อมูลจาก filter เดิมปะปน
- [ ] Refresh/Back/Forward/เปิด URL เดิมคืนค่าเดิม
- [ ] error/empty/loading ไม่ reset filter และยังมี retry

