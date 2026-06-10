import postgres from "postgres";

let databaseUrl = process.env.DATABASE_URL;
let databaseTarget = databaseUrl ? "DATABASE_URL from environment" : null;

if (
  !databaseUrl &&
  process.env.DB_HOST &&
  process.env.DB_USER &&
  process.env.DB_PASSWORD &&
  process.env.DB_NAME
) {
  const dbPort = process.env.DB_PORT || "5432";
  databaseUrl = [
    "postgresql://",
    encodeURIComponent(process.env.DB_USER),
    ":",
    encodeURIComponent(process.env.DB_PASSWORD),
    "@",
    process.env.DB_HOST,
    ":",
    dbPort,
    "/",
    encodeURIComponent(process.env.DB_NAME),
  ].join("");
  databaseTarget = `${process.env.DB_HOST}:${dbPort}/${process.env.DB_NAME}`;
}

if (!databaseUrl) {
  const serverConfig = await import("./server-db-env.mjs");
  databaseUrl = serverConfig.serverDatabaseEnv.DATABASE_URL;
  databaseTarget = serverConfig.databaseTarget;
}

console.log(`[db:push:server] DATABASE_URL -> ${databaseTarget}`);

const sql = postgres(databaseUrl, { connect_timeout: 5 });

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
      create table if not exists stations (
        station_id text,
        station_id_new text,
        station_name text,
        station_type text,
        latitude double precision,
        longitude double precision,
        province text,
        district text,
        subdistrict text,
        health_region text,
        created_at timestamp with time zone default now()
      )
    `;

    await transaction`
      create index if not exists idx_stations_id
      on stations (station_id)
    `;

    await transaction`
      create index if not exists idx_stations_id_new
      on stations (station_id_new)
    `;

    await transaction`
      create table if not exists pm25_hourly (
        station_id_new text not null,
        air4_time timestamp with time zone not null,
        pm25 double precision,
        pm10 double precision,
        o3 double precision,
        co double precision,
        no2 double precision,
        so2 double precision
      )
    `;

    await transaction`
      create unique index if not exists uq_pm25_hourly_station_time
      on pm25_hourly (station_id_new, air4_time)
    `;

    await transaction`
      create index if not exists idx_pm25_hourly_air4_time
      on pm25_hourly (air4_time)
    `;

    await transaction`
      create table if not exists pm25_daily (
        air4_date date not null,
        station_id_new text not null,
        pm25_max numeric(12, 2),
        pm25_min numeric(12, 2),
        pm25_avg numeric(12, 2),
        pm10_max numeric(12, 2),
        pm10_min numeric(12, 2),
        pm10_avg numeric(12, 2),
        o3_max numeric(12, 2),
        o3_min numeric(12, 2),
        o3_avg numeric(12, 2),
        co_max numeric(12, 2),
        co_min numeric(12, 2),
        co_avg numeric(12, 2),
        no2_max numeric(12, 2),
        no2_min numeric(12, 2),
        no2_avg numeric(12, 2),
        so2_max numeric(12, 2),
        so2_min numeric(12, 2),
        so2_avg numeric(12, 2)
      )
    `;

    await transaction.unsafe(`
      alter table pm25_daily
        alter column pm25_max type numeric(12, 2) using round(pm25_max::numeric, 2),
        alter column pm25_min type numeric(12, 2) using round(pm25_min::numeric, 2),
        alter column pm25_avg type numeric(12, 2) using round(pm25_avg::numeric, 2),
        alter column pm10_max type numeric(12, 2) using round(pm10_max::numeric, 2),
        alter column pm10_min type numeric(12, 2) using round(pm10_min::numeric, 2),
        alter column pm10_avg type numeric(12, 2) using round(pm10_avg::numeric, 2),
        alter column o3_max type numeric(12, 2) using round(o3_max::numeric, 2),
        alter column o3_min type numeric(12, 2) using round(o3_min::numeric, 2),
        alter column o3_avg type numeric(12, 2) using round(o3_avg::numeric, 2),
        alter column co_max type numeric(12, 2) using round(co_max::numeric, 2),
        alter column co_min type numeric(12, 2) using round(co_min::numeric, 2),
        alter column co_avg type numeric(12, 2) using round(co_avg::numeric, 2),
        alter column no2_max type numeric(12, 2) using round(no2_max::numeric, 2),
        alter column no2_min type numeric(12, 2) using round(no2_min::numeric, 2),
        alter column no2_avg type numeric(12, 2) using round(no2_avg::numeric, 2),
        alter column so2_max type numeric(12, 2) using round(so2_max::numeric, 2),
        alter column so2_min type numeric(12, 2) using round(so2_min::numeric, 2),
        alter column so2_avg type numeric(12, 2) using round(so2_avg::numeric, 2)
    `);

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
