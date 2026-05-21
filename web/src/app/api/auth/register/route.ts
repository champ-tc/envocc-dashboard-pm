import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// สร้างเงื่อนไขการตรวจสอบด้วย Zod
const registerSchema = z.object({
    prefix: z.string().optional(),
    name: z.string().min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร"),
    phone: z.string().optional(),
    email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
    idCard: z.string().optional(),
    username: z.string().min(5, "ชื่อผู้ใช้งานต้องมีอย่างน้อย 5 ตัวอักษร").max(20, "ชื่อผู้ใช้งานต้องไม่เกิน 20 ตัวอักษร").regex(/^[a-zA-Z0-9._\-@#$%]+$/, "ชื่อผู้ใช้งานประกอบด้วย a-z, A-Z, 0-9 และเครื่องหมาย . _ - @ # $ % เท่านั้น"),
    password: z.string().min(12, "รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร").max(30, "รหัสผ่านต้องไม่เกิน 30 ตัวอักษร").regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, "รหัสผ่านต้องประกอบด้วยตัวเลข ตัวอักษรพิมพ์เล็ก และตัวอักษรพิมพ์ใหญ่"),
    province: z.string().optional(),
    district: z.string().optional(),
    subDistrict: z.string().optional(),
    workplaceType: z.string().optional(),
    workplace: z.string().optional(),
    personnelType: z.string().optional(),
    position: z.string().optional(),
    level: z.string().optional(),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        // 1. ตรวจสอบความถูกต้องของข้อมูล (Validation)
        const validatedData = registerSchema.parse(body);

        // 2. เช็คว่ามีอีเมลนี้อยู่ในระบบแล้วหรือยัง
        const existingUser = await db.select().from(users).where(eq(users.email, validatedData.email));
        if (existingUser.length > 0) {
            console.error("Register Error: Email exists", validatedData.email);
            return NextResponse.json({ error: "อีเมลนี้มีผู้ใช้งานแล้ว" }, { status: 400 });
        }

        // 3. เข้ารหัสผ่าน และบันทึกลง Database
        const hashedPassword = await bcrypt.hash(validatedData.password, 10);
        await db.insert(users).values({
            prefix: validatedData.prefix,
            name: validatedData.name,
            phone: validatedData.phone,
            email: validatedData.email,
            idCard: validatedData.idCard,
            username: validatedData.username,
            password: hashedPassword,
            province: validatedData.province,
            district: validatedData.district,
            subDistrict: validatedData.subDistrict,
            workplaceType: validatedData.workplaceType,
            workplace: validatedData.workplace,
            personnelType: validatedData.personnelType,
            position: validatedData.position,
            level: validatedData.level,
            role: 'user',
            status: 'pending'
        });

        console.log("Register Success:", validatedData.email);
        return NextResponse.json({ message: "สมัครสำเร็จ รอการอนุมัติ" });

    } catch (error) {
        console.error("Register Exception Caught:", error);
        // ถ้าผิดเงื่อนไข Zod ให้ดักจับและส่ง Error กลับไป
        if (error instanceof z.ZodError) {
            console.error("Register ZodError:", JSON.stringify(error.issues));
            return NextResponse.json({ error: error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
        }

        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ error: "เกิดข้อผิดพลาดในการสมัครสมาชิก" }, { status: 500 });
    }
}