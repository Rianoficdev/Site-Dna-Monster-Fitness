begin;

alter table "User"
  add column if not exists "failedLoginAttempts" integer not null default 0;

alter table "User"
  add column if not exists "loginLockUntil" timestamptz;

commit;
