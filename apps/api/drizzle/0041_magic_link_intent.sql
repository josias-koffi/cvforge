-- What a free tool's visitor asked for, carried by their magic link (US-133):
-- an ATS scan to reopen, an offer, a job and a place, a company. Deleted with
-- the link, on redemption or expiry. Never CV text: identifiers and job
-- offers only.
ALTER TABLE "auth_magic_links" ADD COLUMN IF NOT EXISTS "intent" jsonb;
