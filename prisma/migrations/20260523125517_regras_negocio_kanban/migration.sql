/*
Warnings:

- The values [PENDENTE,FAZENDO,FINALIZADO] on the enum `Status` will be removed. If these variants are still used in the database, this will fail.
- The `payment_method` column on the `orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
- Added the required column `cost` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Section" AS ENUM ('PENDENTE', 'FAZENDO', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CARTAO');

-- AlterEnum
BEGIN;

CREATE TYPE "Status_new" AS ENUM ('AGUARDANDO_IMPRESSAO', 'IMPRIMINDO', 'CONCLUIDO', 'PAGAMENTO_PARCIAL', 'PAGAMENTO_FINALIZADO');

ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "orders" ALTER COLUMN "status" TYPE "Status_new" USING (
    CASE "status"::text
      WHEN 'PENDENTE' THEN 'AGUARDANDO_IMPRESSAO'::"Status_new"
      WHEN 'FAZENDO' THEN 'IMPRIMINDO'::"Status_new"
      WHEN 'FINALIZADO' THEN 'CONCLUIDO'::"Status_new"
      ELSE 'AGUARDANDO_IMPRESSAO'::"Status_new"
    END
  );

ALTER TYPE "Status" RENAME TO "Status_old";

ALTER TYPE "Status_new" RENAME TO "Status";

DROP TYPE "Status_old";

ALTER TABLE "orders"
ALTER COLUMN "status"
SET DEFAULT 'AGUARDANDO_IMPRESSAO';

COMMIT;

-- AlterTable
ALTER TABLE "clients" ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "orders"
ADD COLUMN "cost" DOUBLE PRECISION,
ADD COLUMN "link" TEXT,
ADD COLUMN "machine" TEXT,
ADD COLUMN "section" "Section" NOT NULL DEFAULT 'PENDENTE',
DROP COLUMN "payment_method",
ADD COLUMN "payment_method" "PaymentMethod",
ALTER COLUMN "status"
SET DEFAULT 'AGUARDANDO_IMPRESSAO';

ALTER TABLE "orders"
DROP CONSTRAINT IF EXISTS chk_payment_method_when_finished;

ALTER TABLE "orders"
ADD CONSTRAINT chk_orders_business_rules CHECK (
    NOT(
        "section" = 'FINALIZADO'
        AND "status" = 'AGUARDANDO_IMPRESSAO'
    )
    AND NOT(
        "status" IN (
            'PAGAMENTO_PARCIAL',
            'PAGAMENTO_FINALIZADO'
        )
        AND "payment_method" IS NULL
    )
);

CREATE OR REPLACE FUNCTION trigger_update_order_section()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."status" <> OLD."status" AND OLD."section" = 'PENDENTE' THEN
        NEW."section" := 'FAZENDO';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_order_status_change
BEFORE UPDATE ON "orders"
FOR EACH ROW
EXECUTE FUNCTION trigger_update_order_section();