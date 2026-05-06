-- 015_increment_couple_metrics_rpc.sql
-- Atomic upsert for daily couple metrics. Called from sms-received pipeline.

CREATE OR REPLACE FUNCTION increment_couple_metrics(
  p_couple_id UUID,
  p_date DATE,
  p_messages_received INT DEFAULT 0,
  p_messages_auto_replied INT DEFAULT 0,
  p_escalations INT DEFAULT 0,
  p_drafts_used INT DEFAULT 0,
  p_drafts_rewritten INT DEFAULT 0,
  p_inbox_opens INT DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  INSERT INTO couple_metrics (couple_id, date, messages_received, messages_auto_replied, escalations, drafts_used, drafts_rewritten, inbox_opens)
  VALUES (p_couple_id, p_date, p_messages_received, p_messages_auto_replied, p_escalations, p_drafts_used, p_drafts_rewritten, p_inbox_opens)
  ON CONFLICT (couple_id, date) DO UPDATE SET
    messages_received = couple_metrics.messages_received + EXCLUDED.messages_received,
    messages_auto_replied = couple_metrics.messages_auto_replied + EXCLUDED.messages_auto_replied,
    escalations = couple_metrics.escalations + EXCLUDED.escalations,
    drafts_used = couple_metrics.drafts_used + EXCLUDED.drafts_used,
    drafts_rewritten = couple_metrics.drafts_rewritten + EXCLUDED.drafts_rewritten,
    inbox_opens = couple_metrics.inbox_opens + EXCLUDED.inbox_opens;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
