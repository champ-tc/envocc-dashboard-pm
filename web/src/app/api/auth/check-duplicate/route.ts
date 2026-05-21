import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { or, eq } from 'drizzle-orm';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, email, idCard } = body;

        const conditions = [];
        if (username) conditions.push(eq(users.username, username));
        if (email) conditions.push(eq(users.email, email));
        if (idCard) conditions.push(eq(users.idCard, idCard));

        if (conditions.length === 0) {
            return NextResponse.json({ message: "ไม่พบข้อมูลสำหรับตรวจสอบ" }, { status: 400 });
        }

        const existingUsers = await db.select().from(users).where(or(...conditions));

        if (existingUsers.length > 0) {
            const duplicates = [];
            const foundUser = existingUsers.find(u => u.username === username);
            if (foundUser) duplicates.push('ชื่อผู้ใช้งาน (Username)');
            
            const foundEmail = existingUsers.find(u => u.email === email);
            if (foundEmail) duplicates.push('อีเมล (Email)');
            
            const foundIdCard = existingUsers.find(u => u.idCard === idCard);
            if (foundIdCard) duplicates.push('เลขบัตรประชาชน');
            
            return NextResponse.json({ 
                error: `พบข้อมูลซ้ำในระบบ: ${duplicates.join(', ')}` 
            }, { status: 400 });
        }

        return NextResponse.json({ message: "ข้อมูลสามารถใช้งานได้" });
    } catch (error) {
        console.error("Check Duplicate Error:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" }, { status: 500 });
    }
}
