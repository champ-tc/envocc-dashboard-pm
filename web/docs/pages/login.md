# Login — `/login`

## สิ่งที่ต้องคงไว้

- [ ] username และ password เป็น required และมี autocomplete ที่เหมาะสม
- [ ] แสดง/ซ่อน password ไม่ทำให้ค่าที่พิมพ์หาย
- [ ] ป้องกัน submit ซ้ำและแสดง loading/toast
- [ ] จัดการ response ที่ไม่ใช่ JSON และ HTTP 429 ได้
- [ ] login สำเร็จตั้ง session ผ่าน API แล้ว redirect ตาม role
- [ ] admin roles ไป `/admin`; role อื่นไป `/user`
- [ ] login ล้มเหลวคงข้อมูลที่กรอกและแสดง error
- [ ] ลิงก์กลับหน้าหลักและสมัครสมาชิกยังอยู่
- [ ] พื้นหลัง `OpenSkyBackground` และ layering ของ login card ยังอยู่และอ่านได้

## ตรวจรับ

- [ ] success, wrong credentials, rate limit, network error
- [ ] กด Enter และปุ่ม submit ทำงานถูกต้อง
- [ ] password ไม่ถูกเปิดเผยใน URL/log และ UI responsive

