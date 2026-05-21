import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ role: null, id: null });
        }

        const secretKey = process.env.JWT_SECRET || 'my-super-secret';
        const SECRET = new TextEncoder().encode(secretKey);
        const { payload } = await jwtVerify(token, SECRET);

        return NextResponse.json({
            role: payload.role,
            id: payload.id,
            name: payload.name
        });
    } catch (error) {
        return NextResponse.json({ role: null, id: null });
    }
}
