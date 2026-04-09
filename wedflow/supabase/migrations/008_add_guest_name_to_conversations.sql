-- Add guest_name column to conversations table
alter table conversations add column if not exists guest_name text;

-- Add comment for documentation
comment on column conversations.guest_name is 'Optional display name for the guest, used in the dashboard UI';
