import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const { pathname } = request.nextUrl;

    const publicAuthRoutes = ['/login', '/register'];
    const isAdminRoute = pathname.startsWith('/admin');
    const isUserRoute = pathname.startsWith('/user');
    const isSuperadminRoute = pathname.startsWith('/admin/users');

    // ถ้าไม่มี Token แต่พยายามเข้าหน้า Protected
    if (!token) {
        if (isAdminRoute || isUserRoute) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
        return NextResponse.next();
    }

    try {
        const secretKey = process.env.JWT_SECRET || 'my-super-secret';
        const SECRET = new TextEncoder().encode(secretKey);
        
        // ถอดรหัส JWT (Edge compatible) 
        const { payload } = await jwtVerify(token, SECRET);
        const role = payload.role as string;

        // ถ้าล็อกอินแล้วและพยายามเข้าหน้า Login/Register ให้ Redirect
        if (publicAuthRoutes.includes(pathname)) {
            if (role === 'admin' || role === 'superadmin') {
                return NextResponse.redirect(new URL('/admin', request.url));
            } else {
                return NextResponse.redirect(new URL('/user', request.url));
            }
        }

        // จัดการการเข้าถึง /admin/*
        if (isAdminRoute) {
            if (role !== 'admin' && role !== 'superadmin') {
                return NextResponse.redirect(new URL('/user', request.url)); // ถ้าเป็น user ให้ไปหน้า /user
            }
            // เฉพาะหน้าที่จำกัดสำหรับ superadmin
            if (isSuperadminRoute && role !== 'superadmin') {
                return NextResponse.redirect(new URL('/admin', request.url)); // กลับไปหน้า admin หลัก
            }
        }

        // จัดการการเข้าถึง /user/*
        if (isUserRoute) {
            if (role !== 'user') {
                return NextResponse.redirect(new URL('/admin', request.url)); // ถ้าเป็นแอดมินให้ไปหน้า admin
            }
        }

        return NextResponse.next();
    } catch (error) {
        // กรณี Token พัง หรือหมดอายุ
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('token');
        return response;
    }
}

export const config = {
    // กำหนด Path ที่จะให้ Middleware นี้ทำงาน
    matcher: ['/admin/:path*', '/user/:path*', '/login', '/register']
};
