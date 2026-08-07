#!/usr/bin/env bash
set -euo pipefail

C="toc-portal-db"
DB="toc_db"
U="toc_user"

psql_stdin() { docker exec -i "$C" psql -U "$U" -d "$DB"; }

# ── 1. users — extract 9 columns from 34-col Supabase auth.users CSV ──
echo "=== users ==="
docker cp users.csv "$C":/tmp/users.csv
python3 -c "
import csv, sys
WANTED = {  # 0-based positions in Supabase auth.users CSV
    'id': 1, 'email': 4, 'encrypted_password': 5,
    'email_confirmed_at': 6, 'last_sign_in_at': 15,
    'raw_app_meta_data': 16, 'raw_user_meta_data': 17,
    'created_at': 19, 'updated_at': 20,
}
with open('users.csv') as f:
    reader = csv.reader(f)
    header = next(reader)
    writer = csv.writer(sys.stdout)
    writer.writerow(list(WANTED.keys()))
    for row in reader:
        writer.writerow([row[i] if i < len(row) else '' for i in WANTED.values()])
" > _users_fixed.csv
docker cp _users_fixed.csv "$C":/tmp/_users_fixed.csv
psql_stdin <<'SQL'
\copy users (id, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) from '/tmp/_users_fixed.csv' with (format csv, header true)
SQL
rm _users_fixed.csv

# ── 2. members — create stub users for invited-but-never-logged-in members ──
echo "=== members ==="
docker cp members.csv "$C":/tmp/members.csv
# Stage members in a temp table, create missing users, then insert
psql_stdin <<'SQL'
drop table if exists _stg_members;
create temp table _stg_members (email text, name text, role text, status text, temp_password text, created_at timestamptz, client text);
\copy _stg_members (email, name, role, status, temp_password, created_at, client) from '/tmp/members.csv' with (format csv, header true)
-- create stub users for members that don't have a users row yet
insert into users (email, name)
select email, name from _stg_members
where email not in (select email from users)
on conflict (email) do nothing;
-- now safe to insert members
insert into members (email, name, role, status, temp_password, created_at, client)
select email, name, role, status, temp_password, created_at, client from _stg_members
on conflict (email) do nothing;
drop table _stg_members;
SQL

# ── 3. profiles — JSON arrays → PG arrays; CSV: email,name,role_type,...,skills,onboarded,updated_at,avatar_url ──
echo "=== profiles ==="
python3 -c "
import csv, sys
with open('profiles.csv') as f:
    r = csv.DictReader(f, restval='')
    w = csv.writer(sys.stdout)
    w.writerow(r.fieldnames)
    for row in r:
        s = row.get('skills','')
        if s.startswith('['):
            row['skills'] = '{' + s[1:-1].replace('\"', '') + '}'
        elif not s.strip():
            row['skills'] = '{}'
        if not row.get('onboarded','').strip():
            row['onboarded'] = 'false'
        w.writerow([row.get(c,'') for c in r.fieldnames])
" > _profiles_fixed.csv
docker cp _profiles_fixed.csv "$C":/tmp/_profiles_fixed.csv
psql_stdin <<'SQL'
\copy profiles (email, name, role_type, department, commitment, tenure, skills, onboarded, updated_at, avatar_url) from '/tmp/_profiles_fixed.csv' with (format csv, header true, force_not_null (name, role_type, department, commitment, tenure, avatar_url))
SQL
rm _profiles_fixed.csv

# ── 4. notifications ──
echo "=== notifications ==="
docker cp notifications.csv "$C":/tmp/notifications.csv
psql_stdin <<'SQL'
\copy notifications from '/tmp/notifications.csv' with (format csv, header true)
SQL

# ── 5. course ──
echo "=== course ==="
docker cp course.csv "$C":/tmp/course.csv
psql_stdin <<'SQL'
\copy course from '/tmp/course.csv' with (format csv, header true)
SQL

# ── 6. course_progress — JSON arrays; CSV: email,done,updated_at,meta ──
echo "=== course_progress ==="
python3 -c "
import csv, sys
with open('course_progress.csv') as f:
    r = csv.DictReader(f, restval='')
    w = csv.writer(sys.stdout)
    w.writerow(r.fieldnames)
    for row in r:
        d = row.get('done','')
        if d.startswith('['):
            row['done'] = '{' + d[1:-1].replace('\"', '') + '}'
        if not row.get('meta','').strip():
            row['meta'] = '{}'
        if not row.get('updated_at','').strip():
            row['updated_at'] = 'now()'
        w.writerow([row.get(c,'') for c in r.fieldnames])
" > _cp_fixed.csv
docker cp _cp_fixed.csv "$C":/tmp/_cp_fixed.csv
psql_stdin <<'SQL'
\copy course_progress (email, done, updated_at, meta) from '/tmp/_cp_fixed.csv' with (format csv, header true)
SQL
rm _cp_fixed.csv

# ── 7. clients ──
echo "=== clients ==="
docker cp clients.csv "$C":/tmp/clients.csv
psql_stdin <<'SQL'
\copy clients from '/tmp/clients.csv' with (format csv, header true)
SQL

# ── 8. toc ──
echo "=== toc ==="
docker cp toc.csv "$C":/tmp/toc.csv
psql_stdin <<'SQL'
\copy toc from '/tmp/toc.csv' with (format csv, header true)
SQL

# ── 9. messages ──
echo "=== messages ==="
docker cp messages.csv "$C":/tmp/messages.csv
psql_stdin <<'SQL'
\copy messages from '/tmp/messages.csv' with (format csv, header true)
SQL

# ── 10. dms ──
echo "=== dms ==="
docker cp dms.csv "$C":/tmp/dms.csv
psql_stdin <<'SQL'
\copy dms from '/tmp/dms.csv' with (format csv, header true)
SQL

echo "=== All 10 tables imported ==="
