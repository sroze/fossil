CREATE TABLE "orgs" (
  org_id UUID PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE "profiles" (
  user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL
);

CREATE TABLE "users_in_orgs" (
  org_id UUID NOT NULL REFERENCES orgs (org_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles (user_id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  PRIMARY KEY (org_id, user_id)
);
