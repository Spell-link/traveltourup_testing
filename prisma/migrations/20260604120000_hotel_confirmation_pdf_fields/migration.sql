-- AlterTable
ALTER TABLE "hotel_bookings" ADD COLUMN IF NOT EXISTS "confirmation_pdf_storage_path" VARCHAR(512),
ADD COLUMN IF NOT EXISTS "confirmation_pdf_generated_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "confirmation_pdf_generation_failed_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "confirmation_pdf_error" VARCHAR(500);

-- Private bucket for hotel confirmation PDFs (service-role uploads from API routes)
INSERT INTO storage.buckets (id, name, public)
VALUES ('hotel-vouchers', 'hotel-vouchers', false)
ON CONFLICT (id) DO NOTHING;
