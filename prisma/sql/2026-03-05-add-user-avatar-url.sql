begin;

alter table "User"
  add column if not exists "avatar_url" text not null default '';

commit;
