/*
  Warnings:

  - You are about to drop the column `clientId` on the `orders` table. All the data in the column will be lost.
  - The `status` column on the `orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updated_at` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_clientId_fkey";

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "clientId",
ADD COLUMN     "client_id" INTEGER,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'PENDENTE';

-- CreateTable
CREATE TABLE "calculator_parameters" (
    "id" SERIAL NOT NULL,
    "filament_price" DOUBLE PRECISION NOT NULL,
    "kw_cost" DOUBLE PRECISION NOT NULL,
    "depreciation" DOUBLE PRECISION NOT NULL,
    "profit_margin" DOUBLE PRECISION NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calculator_parameters_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
