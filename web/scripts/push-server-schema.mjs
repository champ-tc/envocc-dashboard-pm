import postgres from "postgres";

import { databaseTarget, serverDatabaseEnv } from "./server-db-env.mjs";

console.log(`[db:push:server] DATABASE_URL -> ${databaseTarget}`);

const sql = postgres(serverDatabaseEnv.DATABASE_URL, { connect_timeout: 5 });

try {
  await sql.begin(async (transaction) => {
    await transaction`
      create table if not exists users (
        id serial primary key,
        prefix varchar(50),
        name varchar(255) not null,
        phone varchar(20),
        email varchar(255) not null unique,
        id_card varchar(20),
        username varchar(100),
        password text not null,
        province varchar(150),
        district varchar(150),
        sub_district varchar(150),
        workplace_type varchar(255),
        workplace varchar(255),
        personnel_type varchar(100),
        position varchar(100),
        level varchar(100),
        workplace_province varchar(150),
        ddc_region varchar(150),
        role varchar default 'user',
        status varchar default 'pending',
        created_at timestamp default now()
      )
    `;

    await transaction`
      create table if not exists hdc_data (
        id serial primary key,
        no integer,
        province_code varchar(10),
        province_name varchar(255),
        region_name varchar(255),
        county integer,
        year integer,
        week integer,
        month integer,
        typediag_id integer,
        typediag varchar(255),
        icd10 varchar(255),
        typediag_name varchar(255),
        diagnosis varchar(255),
        "case" integer,
        created_at timestamp default now()
      )
    `;

    await transaction`
      create table if not exists data_requests (
        id serial primary key,
        user_id integer not null,
        data_type varchar(50) default 'bigdata_hdc',
        status varchar default 'pending',
        request_date timestamp default now(),
        approved_date timestamp,
        expired_date timestamp,
        admin_notes text
      )
    `;

    await transaction`
      create table if not exists pm25_daily (
        air4_date date not null,
        station_id_new text not null,
        pm25_max double precision,
        pm25_min double precision,
        pm25_avg double precision,
        pm10_max double precision,
        pm10_min double precision,
        pm10_avg double precision,
        o3_max double precision,
        o3_min double precision,
        o3_avg double precision,
        co_max double precision,
        co_min double precision,
        co_avg double precision,
        no2_max double precision,
        no2_min double precision,
        no2_avg double precision,
        so2_max double precision,
        so2_min double precision,
        so2_avg double precision
      )
    `;

    await transaction`
      create unique index if not exists uq_pm25_daily_station_date
      on pm25_daily (station_id_new, air4_date)
    `;

    await transaction`
      create index if not exists idx_pm25_daily_air4_date
      on pm25_daily (air4_date)
    `;
  });

  const tables = await sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
    order by table_name
  `;
  console.log(`[db:push:server] tables -> ${tables.map(({ table_name }) => table_name).join(", ")}`);
} finally {
  await sql.end({ timeout: 1 });
}
