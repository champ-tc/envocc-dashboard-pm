import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifySessionToken } from '@/lib/session-token';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ role: null, id: null });
        }

        const payload = await verifySessionToken(token);
        const [user] = await db.select({
            id: users.id,
            role: users.role,
            name: users.name,
            status: users.status,
        }).from(users).where(eq(users.id, payload.id)).limit(1);

        if (!user || user.status !== 'approved') {
            return NextResponse.json({ role: null, id: null, name: null });
        }

        return NextResponse.json({
            role: user.role,
            id: user.id,
            name: user.name,
        });
    } catch {
        return NextResponse.json({ role: null, id: null, name: null });
    }
}
