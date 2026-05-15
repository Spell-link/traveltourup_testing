-- Supabase compatibility bootstrap for Prisma shadow databases and empty local Postgres.
-- This creates the minimum storage/auth shape needed by later storage policy migrations.

DO $bootstrap$
BEGIN
  IF to_regnamespace('storage') IS NULL THEN
    EXECUTE 'CREATE SCHEMA storage';
  END IF;

  IF to_regnamespace('auth') IS NULL THEN
    EXECUTE 'CREATE SCHEMA auth';
  END IF;

  IF to_regrole('authenticated') IS NULL THEN
    EXECUTE 'CREATE ROLE authenticated NOLOGIN';
  END IF;

  IF to_regrole('anon') IS NULL THEN
    EXECUTE 'CREATE ROLE anon NOLOGIN';
  END IF;

  IF to_regrole('service_role') IS NULL THEN
    EXECUTE 'CREATE ROLE service_role NOLOGIN';
  END IF;

  IF to_regclass('storage.buckets') IS NULL THEN
    EXECUTE $sql$
      CREATE TABLE storage.buckets (
        id text PRIMARY KEY,
        name text NOT NULL,
        public boolean NOT NULL DEFAULT false
      )
    $sql$;
  END IF;

  IF to_regclass('storage.objects') IS NULL THEN
    EXECUTE $sql$
      CREATE TABLE storage.objects (
        bucket_id text NOT NULL,
        name text NOT NULL,
        PRIMARY KEY (bucket_id, name)
      )
    $sql$;
  END IF;

  IF to_regprocedure('auth.uid()') IS NULL THEN
    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION auth.uid()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      AS $fn$
        SELECT NULL::uuid;
      $fn$;
    $sql$;
  END IF;
END
$bootstrap$;
