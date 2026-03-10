begin;

-- 1) EXERCISE (biblioteca fixa)
create table if not exists exercise (
  id serial primary key,
  name text not null,
  muscle_group text not null,
  description text not null,
  animation_url text not null default '',
  tutorial_text text not null default '',
  level text not null default 'intermediario',
  type text not null default 'forca',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exercise_is_active on exercise (is_active);
create index if not exists idx_exercise_muscle_group on exercise (muscle_group);

-- 2) WORKOUT_TEMPLATE (modelos reutilizáveis)
create table if not exists workout_template (
  id serial primary key,
  name text not null,
  description text,
  created_by integer not null references "User"(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workout_template_created_by on workout_template (created_by);
create index if not exists idx_workout_template_is_active on workout_template (is_active);

-- 3) WORKOUT_TEMPLATE_EXERCISE (liga exercício ao modelo)
create table if not exists workout_template_exercise (
  id serial primary key,
  template_id integer not null references workout_template(id) on delete cascade,
  exercise_id integer not null references exercise(id) on delete restrict,
  "order" integer not null default 1,
  series integer not null default 3,
  reps integer not null default 10,
  default_load double precision not null default 0,
  rest_time integer not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_wte_template_order on workout_template_exercise (template_id, "order");
create index if not exists idx_wte_exercise_id on workout_template_exercise (exercise_id);

-- 4) WORKOUT (treino personalizado por aluno)
create table if not exists workout (
  id serial primary key,
  name text not null,
  student_id integer not null references "User"(id) on delete cascade,
  created_by integer not null references "User"(id) on delete restrict,
  origin_template_id integer references workout_template(id) on delete set null,
  is_active boolean not null default true,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workout_student_active on workout (student_id, is_active);
create index if not exists idx_workout_created_by on workout (created_by);
create index if not exists idx_workout_origin_template on workout (origin_template_id);

-- 5) WORKOUT_EXERCISE (exercício já customizado do aluno)
create table if not exists workout_exercise (
  id serial primary key,
  workout_id integer not null references workout(id) on delete cascade,
  exercise_id integer not null references exercise(id) on delete restrict,
  "order" integer not null default 1,
  series integer not null default 3,
  reps integer not null default 10,
  load double precision not null default 0,
  rest_time integer not null default 30,
  completed boolean not null default false,
  replaced_from_exercise_id integer references exercise(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_we_workout_order on workout_exercise (workout_id, "order");
create index if not exists idx_we_completed on workout_exercise (completed);
create index if not exists idx_we_replaced_from on workout_exercise (replaced_from_exercise_id);

commit;
