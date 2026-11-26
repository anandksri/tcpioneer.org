create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text unique,
    email text,
    created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, username, email)
    values (
        new.id,
        lower(new.raw_user_meta_data ->> 'username'),
        lower(new.email)
    );
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create extension if not exists pgcrypto;

create or replace function public.resolve_login_email(
    p_username text,
    p_password text
)
returns text
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
    resolved_email text;
begin
    select lower(u.email)
    into resolved_email
    from auth.users as u
    join public.profiles as p on p.id = u.id
    where p.username = lower(p_username)
      and u.encrypted_password is not null
      and u.encrypted_password = extensions.crypt(p_password, u.encrypted_password)
    limit 1;

    return resolved_email;
end;
$$;

revoke all on function public.resolve_login_email(text, text) from public;
grant execute on function public.resolve_login_email(text, text) to anon, authenticated;
