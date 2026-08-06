import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/session-token';

export async function proxy(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const { pathname } = request.nextUrl;

    const publicAuthRoutes = ['/login', '/register'];
    const isAdminRoute = pathname.startsWith('/admin');
    const isUserRoute = pathname.startsWith('/user');
    const isSuperadminRoute = pathname.startsWith('/admin/users') || pathname.startsWith('/admin/stations') || pathname.startsWith('/admin/pm25-hourly') || pathname.startsWith('/admin/pm25-daily');

    if (!token) {
        if (isAdminRoute || isUserRoute) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
        return NextResponse.next();
    }

    try {
        const payload = await verifySessionToken(token);
        const role = payload.role;

        if (publicAuthRoutes.includes(pathname)) {
            if (role === 'admin' || role === 'adminenvocc' || role === 'superadmin') {
                return NextResponse.redirect(new URL('/admin', request.url));
            }
            return NextResponse.redirect(new URL('/user', request.url));
        }

        if (isAdminRoute) {
            if (role !== 'admin' && role !== 'adminenvocc' && role !== 'superadmin') {
                return NextResponse.redirect(new URL('/user', request.url));
            }
            if (isSuperadminRoute && role !== 'superadmin') {
                return NextResponse.redirect(new URL('/admin', request.url));
            }
        }

        if (isUserRoute) {
            const userRoles = ['user', 'admin_region', 'admin_province'];
            if (!userRoles.includes(role)) {
                return NextResponse.redirect(new URL('/admin', request.url));
            }
        }

        return NextResponse.next();
    } catch {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('token');
        return response;
    }
}

export const config = {
    matcher: ['/admin/:path*', '/user/:path*', '/login', '/register'],
};
