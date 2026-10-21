-- Default role categories (editable later in Data & Settings).
INSERT INTO "categories" ("name", "sort_order") VALUES
  ('Backend Developer', 0),
  ('Frontend Developer', 1),
  ('Full-stack Developer', 2),
  ('QA Engineer', 3),
  ('QA Automation Engineer', 4),
  ('AI Engineer', 5),
  ('DevOps Engineer', 6),
  ('Other', 7)
ON CONFLICT DO NOTHING;
