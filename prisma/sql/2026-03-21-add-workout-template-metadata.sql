begin;

create table if not exists workout_template_metadata (
  template_id integer primary key references workout_template(id) on delete cascade,
  cover_image_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

commit;
