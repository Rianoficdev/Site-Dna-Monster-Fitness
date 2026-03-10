begin;

create table if not exists workout_completion (
  id serial primary key,
  user_id integer not null references "User"(id) on delete cascade,
  workout_id integer not null,
  completed_date_key text not null,
  completed_at timestamptz not null default now(),
  workout_title text not null,
  duration_minutes integer not null default 1,
  kcal double precision not null default 0,
  group_key text not null default '',
  thumbnail_url text not null default '',
  cover_image_url text not null default '',
  exercise_count integer not null default 0,
  snapshot jsonb,
  source_updated_at timestamptz
);

create unique index if not exists idx_workout_completion_user_workout_date
  on workout_completion (user_id, workout_id, completed_date_key);

create index if not exists idx_workout_completion_user_completed_at
  on workout_completion (user_id, completed_at desc);

create index if not exists idx_workout_completion_user_completed_date
  on workout_completion (user_id, completed_date_key);

create index if not exists idx_workout_completion_workout_completed_at
  on workout_completion (workout_id, completed_at desc);

commit;
