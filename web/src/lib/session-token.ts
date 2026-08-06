import { JWTPayload, SignJWT, jwtVerify } from 'jose';

const SESSION_ISSUER = 'envocc-dashboard';
const SESSION_AUDIENCE = 'envocc-dashboard-web';

export interface SessionPayload extends JWTPayload {
    id: number;
    role: string;
    name: string;
}

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error('JWT_SECRET is not defined in environment');
    }

    return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: Pick<SessionPayload, 'id' | 'role' | 'name'>) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer(SESSION_ISSUER)
        .setAudience(SESSION_AUDIENCE)
        .setExpirationTime('1h')
        .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload> {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
        algorithms: ['HS256'],
        issuer: SESSION_ISSUER,
        audience: SESSION_AUDIENCE,
    });

    if (
        typeof payload.id !== 'number' ||
        typeof payload.role !== 'string' ||
        typeof payload.name !== 'string'
    ) {
        throw new Error('Invalid session payload');
    }

    return payload as SessionPayload;
}
