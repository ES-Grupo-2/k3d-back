-- Add required name support for manager-created users.
ALTER TABLE "users" ADD COLUMN "name" TEXT;

UPDATE "users"
SET "name" = "email"
WHERE "name" IS NULL;

ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;
