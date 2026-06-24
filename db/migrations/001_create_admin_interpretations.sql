CREATE TABLE IF NOT EXISTS admin_interpretations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT,
  title TEXT NOT NULL,
  law_name TEXT,
  article TEXT,
  question TEXT,
  answer TEXT NOT NULL,
  issue_keywords TEXT,
  ministry TEXT DEFAULT '고용노동부',
  department TEXT,
  reply_date DATE,
  source_url TEXT,
  file_name TEXT,
  page_no INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_interpretations_title
  ON admin_interpretations (title);

CREATE INDEX IF NOT EXISTS idx_admin_interpretations_law_name
  ON admin_interpretations (law_name);

CREATE INDEX IF NOT EXISTS idx_admin_interpretations_article
  ON admin_interpretations (article);

CREATE INDEX IF NOT EXISTS idx_admin_interpretations_issue_keywords
  ON admin_interpretations (issue_keywords);

CREATE INDEX IF NOT EXISTS idx_admin_interpretations_reply_date
  ON admin_interpretations (reply_date);
