# Stage 1: Install dependencies
FROM node:20-bookworm-slim AS deps
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
# ใช้ --legacy-peer-deps เพื่อป้องกันปัญหา Version conflict ของ React 19
RUN npm install --legacy-peer-deps

# Stage 2: Build the application
FROM node:20-bookworm-slim AS builder
RUN apt-get update && apt-get install -y python3 make g++ build-essential && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ตั้งค่า Environment สำหรับ Build
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# บังคับ rebuild duckdb เพื่อความชัวร์ใน stage นี้
RUN npm rebuild duckdb
RUN npm run build

# Stage 3: Production runner
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

# คัดลอกไฟล์ที่จำเป็น
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

# สำคัญ: คัดลอก duckdb binary ที่ rebuild แล้วมาไว้ใน standalone node_modules
# ป้องกันปัญหา MODULE_NOT_FOUND
RUN mkdir -p node_modules/duckdb && \
    cp -r /app/node_modules/duckdb/* node_modules/duckdb/

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
