/*
  Warnings:

  - Made the column `cost` on table `orders` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "cost" SET NOT NULL;
