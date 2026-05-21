# ใช้ Debian แทน Alpine เพื่อความเข้ากันได้ของ Native Binary (DuckDB)
FROM node:20-bookworm-slim AS deps
# ติดตั้ง build-essential สำหรับคอมไพล์ DuckDB
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install

# --- Development stage ---
FROM deps AS development
WORKDIR /app
COPY . .
EXPOSE 3000
# ลบ binary เก่าของ DuckDB ที่อาจติดมาจากเครื่อง Mac และ rebuild ใหม่ในคอนเทนเนอร์
CMD ["sh", "-c", "rm -rf node_modules/duckdb/lib/binding && npm rebuild duckdb && npx next dev -H 0.0.0.0"]

# Stage 2: Build the application
FROM node:20-bookworm-slim AS builder
RUN apt-get update && apt-get install -y python3 make g++ build-essential && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# Stage 3: Production runner
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
RUN mkdir .next && chown nextjs:nextjs .next
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
