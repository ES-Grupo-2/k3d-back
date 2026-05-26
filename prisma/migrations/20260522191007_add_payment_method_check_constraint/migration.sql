-- This is an empty migration.
ALTER TABLE "orders"
ADD CONSTRAINT chk_payment_method_when_finished CHECK (
    (
        "status" = 'FINALIZADO'
        AND "payment_method" IS NOT NULL
    )
    OR ("status" <> 'FINALIZADO')
);