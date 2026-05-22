# Stage 1: Install dependencies
FROM node:20-bookworm-slim AS deps
RUN apt-get update && apt-get install -y python3 make g++ build-essential && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Stage 2: Build the application
FROM node:20-bookworm-slim AS builder
RUN apt-get update && apt-get install -y python3 make g++ build-essential && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm rebuild duckdb
RUN npm run build

# Stage 3: Production runner
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

# คัดลอกไฟล์หลัก
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

# --- จุดสำคัญ: ดึง node_modules ทั้งหมดที่เกี่ยวข้องมาใช้ ---
# standalone mode ของ Next.js อาจจะตัด Native modules ทิ้ง 
# เราจึงต้องนำ node_modules จากขั้นตอน build มาวางทับเพื่อให้ DuckDB ทำงานได้
COPY --from=builder --chown=nextjs:nextjs /app/node_modules ./node_modules

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
