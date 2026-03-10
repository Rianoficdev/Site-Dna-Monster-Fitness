begin;

alter table workout
  add column if not exists cover_image_url text not null default '';

commit;
