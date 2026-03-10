begin;

create table if not exists workout_metadata (
  workout_id integer primary key references workout(id) on delete cascade,
  objective text not null default '',
  description text not null default '',
  week_days jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workout_metadata_updated_at
  on workout_metadata (updated_at);

alter table workout_exercise
  add column if not exists observation text not null default '';

create table if not exists body_metric (
  id serial primary key,
  user_id integer not null references "User"(id) on delete cascade,
  date_key text not null,
  weight_kg double precision null,
  height_cm double precision null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date_key)
);

create index if not exists idx_body_metric_user_date
  on body_metric (user_id, date_key);

create index if not exists idx_body_metric_created_at
  on body_metric (created_at);

create table if not exists progress_record (
  id serial primary key,
  user_id integer not null references "User"(id) on delete cascade,
  workout_id integer null,
  exercise_id integer null,
  load double precision not null default 0,
  repetitions integer not null default 0,
  date_value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_progress_record_user_date
  on progress_record (user_id, date_value);

create index if not exists idx_progress_record_created_at
  on progress_record (created_at);

commit;
