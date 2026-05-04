-- Push notification subscriptions for couples' devices
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index idx_push_subscriptions_couple_id on push_subscriptions(couple_id);

-- RLS: couples can only manage their own subscriptions
alter table push_subscriptions enable row level security;

create policy "Couples can read own subscriptions"
  on push_subscriptions for select
  using (couple_id in (
    select id from couples where auth_user_id = auth.uid()
  ));

create policy "Couples can insert own subscriptions"
  on push_subscriptions for insert
  with check (couple_id in (
    select id from couples where auth_user_id = auth.uid()
  ));

create policy "Couples can delete own subscriptions"
  on push_subscriptions for delete
  using (couple_id in (
    select id from couples where auth_user_id = auth.uid()
  ));
