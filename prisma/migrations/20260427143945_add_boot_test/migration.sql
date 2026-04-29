-- AlterTable
ALTER TABLE "BuildJob" ADD COLUMN "bootTestLog" TEXT DEFAULT '';
ALTER TABLE "BuildJob" ADD COLUMN "bootTestStatus" TEXT;
