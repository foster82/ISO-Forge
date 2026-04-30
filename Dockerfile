# Stage 1: Build
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Runner
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install system dependencies
# linux-image-amd64 is needed for libguestfs appliance
RUN apt-get update && apt-get install -y --no-install-recommends \
    p7zip-full \
    xorriso \
    qemu-system-x86 \
    qemu-utils \
    ovmf \
    libguestfs-tools \
    wget \
    linux-image-amd64 \
    && rm -rf /var/lib/apt/lists/*

# libguestfs configuration
# Setting LIBGUESTFS_BACKEND=direct is often necessary in containers
ENV LIBGUESTFS_BACKEND=direct

# Create storage directories
RUN mkdir -p storage/base storage/builds

# Copy standalone build from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Entrypoint handles database initialization
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
