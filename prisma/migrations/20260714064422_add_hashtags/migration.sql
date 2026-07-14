-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[];
