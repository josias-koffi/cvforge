-- Publishing a legal document is logged as `legal_published` since the legal
-- documents landed (0016), but the check constraint still only knew the six
-- account actions of 0011: every publication failed on insert into the audit
-- log. The constraint is rebuilt from the full `adminAuditActions` list.
ALTER TABLE "admin_audit_log" DROP CONSTRAINT "admin_audit_log_action_valid";
--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_action_valid" CHECK ("action" in ('account_suspended', 'account_reactivated', 'account_deleted', 'role_demoted', 'credits_granted', 'sessions_revoked', 'legal_published'));
