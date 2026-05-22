-- AlterTable
ALTER TABLE "flight_bookings" ADD COLUMN "ticket_pdf_storage_path" VARCHAR(512),
ADD COLUMN "ticket_pdf_generated_at" TIMESTAMP(3),
ADD COLUMN "ticket_pdf_generation_failed_at" TIMESTAMP(3),
ADD COLUMN "ticket_pdf_error" VARCHAR(500);
