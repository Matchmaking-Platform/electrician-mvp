-- AlterTable
ALTER TABLE "ElectricianProfile" ADD COLUMN     "availableBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalEarned" DECIMAL(10,2) NOT NULL DEFAULT 0;
