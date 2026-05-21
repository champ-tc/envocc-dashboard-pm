import { pgTable, serial, varchar, text, timestamp, integer } from "drizzle-orm/pg-core";

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    prefix: varchar('prefix', { length: 50 }),
    name: varchar('name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 255 }).unique().notNull(),
    idCard: varchar('id_card', { length: 20 }),
    username: varchar('username', { length: 100 }),
    password: text('password').notNull(),
    province: varchar('province', { length: 150 }),
    district: varchar('district', { length: 150 }),
    subDistrict: varchar('sub_district', { length: 150 }),
    workplaceType: varchar('workplace_type', { length: 255 }), // ฟิลด์ใหม่: ประเภทสถานที่ทำงาน/สถานที่ทำงานหลัก
    workplace: varchar('workplace', { length: 255 }),
    personnelType: varchar('personnel_type', { length: 100 }),
    position: varchar('position', { length: 100 }),
    level: varchar('level', { length: 100 }),
    workplaceProvince: varchar('workplace_province', { length: 150 }), // สิทธิ์เข้าถึงระดับจังหวัด
    ddcRegion: varchar('ddc_region', { length: 150 }), // สิทธิ์เข้าถึงระดับเขต (สคร.)
    role: varchar('role', { enum: ['superadmin', 'admin', 'admin_region', 'admin_province', 'user'] }).default('user'),
    status: varchar('status', { enum: ['pending', 'approved'] }).default('pending'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const hdcData = pgTable('hdc_data', {
    id: serial('id').primaryKey(),
    no: integer('no'),
    provinceCode: varchar('province_code', { length: 10 }),
    provinceName: varchar('province_name', { length: 255 }),
    regionName: varchar('region_name', { length: 255 }),
    county: integer('county'),
    year: integer('year'),
    week: integer('week'),
    month: integer('month'),
    typediagId: integer('typediag_id'),
    typediag: varchar('typediag', { length: 255 }),
    icd10: varchar('icd10', { length: 255 }),
    typediagName: varchar('typediag_name', { length: 255 }),
    diagnosis: varchar('diagnosis', { length: 255 }),
    cases: integer('case'), // Original name in parquet was 'case'
    createdAt: timestamp('created_at').defaultNow(),
});

export const dataRequests = pgTable('data_requests', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    dataType: varchar('data_type', { length: 50 }).default('bigdata_hdc'), // 'bigdata_hdc'
    status: varchar('status', { enum: ['pending', 'approved', 'rejected'] }).default('pending'),
    requestDate: timestamp('request_date').defaultNow(),
    approvedDate: timestamp('approved_date'),
    expiredDate: timestamp('expired_date'),
    adminNotes: text('admin_notes'),
});
