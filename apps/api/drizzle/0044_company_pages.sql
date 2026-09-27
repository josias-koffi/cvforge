-- The companies' public pages (US-140): a sole trader, whose name is a
-- person's, or a unit that asked INSEE to withhold its data never gets one.
-- Null until the next read, which the refresh then does without a month's wait.
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "publishable" boolean;
