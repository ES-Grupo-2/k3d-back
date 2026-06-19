/*
  Warnings:

  - You are about to drop the column `link` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `machine` on the `orders` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "orders" DROP COLUMN "link",
DROP COLUMN "machine";
