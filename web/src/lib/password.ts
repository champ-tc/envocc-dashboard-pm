import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_COMPLEXITY_MESSAGE =
    'รหัสผ่านต้องประกอบด้วยตัวเลข ตัวอักษรพิมพ์เล็ก และพิมพ์ใหญ่';

export const passwordSchema = z.string()
    .min(PASSWORD_MIN_LENGTH, `รหัสผ่านต้องมีอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, PASSWORD_COMPLEXITY_MESSAGE);

export function getPasswordValidationError(password: string) {
    const result = passwordSchema.safeParse(password);
    return result.success ? null : result.error.issues[0]?.message ?? 'รหัสผ่านไม่ถูกต้อง';
}
