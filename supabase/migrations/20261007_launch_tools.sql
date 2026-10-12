begin;
alter table public.site_admin_roles drop constraint if exists site_admin_roles_permissions_check;
alter table public.site_admin_roles add constraint site_admin_roles_permissions_check check(permissions <@ array['users','settings','reports','support']::text[]);
alter table public.site_settings drop constraint if exists site_settings_id_check;
alter table public.site_settings add constraint site_settings_id_check check(id in ('general','public-documents'));
create table if not exists public.support_tickets (
 id uuid primary key default gen_random_uuid(),number bigint generated always as identity unique,
 user_id uuid not null references public.profiles(id) on delete cascade,
 category text not null check(category in ('question','technical','suggestion','copyright')),
 subject text not null check(length(subject) between 5 and 160),
 status text not null default 'open' check(status in ('open','reviewing','resolved','closed')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.support_messages (
 id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.support_tickets(id) on delete cascade,
 sender_id uuid references public.profiles(id) on delete set null,staff boolean not null default false,
 content text not null check(length(content) between 5 and 4000),created_at timestamptz not null default now()
);
create index if not exists support_ticket_user on public.support_tickets(user_id,created_at desc);
create index if not exists support_message_ticket on public.support_messages(ticket_id,created_at);
create table if not exists public.operational_alerts (
 id uuid primary key default gen_random_uuid(),kind text not null, status text not null default 'open' check(status in ('open','resolved')),
 message text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index if not exists operational_alert_open on public.operational_alerts(kind) where status='open';
do $$ declare t text;begin
 foreach t in array array['support_tickets','support_messages','operational_alerts'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end; $$;
grant usage,select on sequence public.support_tickets_number_seq to service_role;
create or replace function public.create_support_ticket(p_actor uuid,p_category text,p_subject text,p_content text) returns jsonb language plpgsql security definer set search_path='' as $$
declare ticket public.support_tickets;
begin
 insert into public.support_tickets(user_id,category,subject) values(p_actor,p_category,p_subject) returning * into ticket;
 insert into public.support_messages(ticket_id,sender_id,content) values(ticket.id,p_actor,p_content);
 return to_jsonb(ticket);
end; $$;
revoke all on function public.create_support_ticket(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.create_support_ticket(uuid,text,text,text) to service_role;
commit;
