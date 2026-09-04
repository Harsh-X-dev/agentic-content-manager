-- Migration: add_media_id_and_approved_at
-- Adds instagram_media_id to the videos table and approved_at to the approvals table.
-- These fields were being silently dropped by saveStage because the columns did not exist.

ALTER TABLE "videos"
  ADD COLUMN IF NOT EXISTS "instagram_media_id" TEXT;

ALTER TABLE "approvals"
  ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMPTZ;
