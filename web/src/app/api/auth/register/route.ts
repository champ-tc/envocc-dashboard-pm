import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { z } from 'zod';

// --- Validation Schema ---
const registerSchema = z.object({
    prefix: z.string().optional(),
    name: z.string().min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร"),
    phone: z.string().regex(/^0\d{9}$/, "เบอร์โทรศัพท์ไม่ถูกต้อง"),
    email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
    idCard: z.string().length(13, "เลขบัตรประชาชนต้องมี 13 หลัก"),
    username: z.string()
        .min(5, "ชื่อผู้ใช้งานต้องมีอย่างน้อย 5 ตัวอักษร")
        .max(20, "ชื่อผู้ใช้งานต้องไม่เกิน 20 ตัวอักษร")
        .regex(/^[a-zA-Z0-9._\-@#$%]+$/, "ชื่อผู้ใช้งานประกอบด้วย a-z, A-Z, 0-9 และ . _ - @ # $ % เท่านั้น"),
    password: z.string()
        .min(12, "รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร")
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, "รหัสผ่านต้องประกอบด้วยตัวเลข ตัวอักษรพิมพ์เล็ก และพิมพ์ใหญ่"),
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

        // 1. ตรวจสอบรูปแบบข้อมูล (Data Validation)
        const validatedData = registerSchema.parse(body);

        // 2. ตรวจสอบข้อมูลซ้ำซ้อน (Duplicate Check: Email, Username, ID Card)
        const existingUsers = await db.select().from(users).where(
            or(
                eq(users.email, validatedData.email),
                eq(users.username, validatedData.username),
                eq(users.idCard, validatedData.idCard)
            )
        );

        if (existingUsers.length > 0) {
            return NextResponse.json(
                { error: "อีเมล, ชื่อผู้ใช้งาน หรือ เลขบัตรประชาชนนี้ มีในระบบแล้ว" }, 
                { status: 400 }
            );
        }

        // 3. เข้ารหัสผ่านเพื่อความปลอดภัย (Password Hashing)
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);

        // 4. บันทึกข้อมูลลงฐานข้อมูล (Database Insertion)
        await db.insert(users).values({
            ...validatedData,
            password: hashedPassword, // ใช้รหัสผ่านที่เข้ารหัสแล้ว
            role: 'user',
            status: 'pending' // ต้องรอ Admin อนุมัติ
        });

        return NextResponse.json({ message: "ลงทะเบียนสำเร็จ กรุณารอการอนุมัติ" }, { status: 201 });

    } catch (error) {
        // จัดการ Error จาก Zod Validation
        if (error instanceof z.ZodError) {
            const firstErrorMessage = error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง";
            return NextResponse.json({ error: firstErrorMessage }, { status: 400 });
        }

        // บันทึก Log เฉพาะฝั่ง Server ป้องกันข้อมูลโครงสร้างรั่วไหล
        console.error("Registration Server Error:", error);
        return NextResponse.json(
            { error: "เกิดข้อผิดพลาดภายในระบบ ไม่สามารถลงทะเบียนได้" }, 
            { status: 500 }
        );
    }
}
