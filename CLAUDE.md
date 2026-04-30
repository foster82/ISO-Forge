# ISO Forge Development Guide

## Commands

### Setup & Installation
- `npm install`: Install dependencies
- `npx prisma generate`: Generate Prisma client
- `npx prisma db push`: Sync database schema with model
- `npx prisma db seed`: Seed initial data

### Development
- `npm run dev`: Start Next.js development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint

### Docker
- `docker-compose up -d --build`: Build and start the containerized stack
- `docker-compose down`: Stop and remove containers

### Database (SQLite)
- Database is located at `prisma/dev.db` (local) or `/app/data/iso-forge.db` (Docker).
- Use `sqlite3 prisma/dev.db` for direct CLI access.

## Architecture

- **Next.js 15 (App Router)**: Core framework using Server Components and Server Actions.
- **Prisma**: Database ORM with SQLite.
- **Auth.js (v5)**: Authentication middleware supporting Local and LDAP providers.
- **Build Engine**: Node.js wrapper for `xorriso`, `7z`, and `virt-customize`.
- **QEMU Runner**: QEMU wrapper for automated boot testing with serial log capture.

## RBAC Roles
- `ADMIN`: Global settings, image management, and deletions.
- `USER`: Profile management, build triggering, and testing.
