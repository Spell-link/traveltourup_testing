ALTER TABLE "users" ADD COLUMN "phone_e164" VARCHAR(20);
ALTER TABLE "users" ADD COLUMN "phone_verified_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "phone_verify_required" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "users_phone_e164_key" ON "users"("phone_e164");
