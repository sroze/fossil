CREATE TABLE "tasks" (
  id UUID PRIMARY KEY,
  done BOOL NOT NULL DEFAULT FALSE,
  name TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "tasks_done_by_due_date" ON "tasks" (done, due_at ASC);
