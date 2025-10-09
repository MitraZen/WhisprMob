# Export Data Using pg_dump

If you have PostgreSQL installed locally, you can use pg_dump to export your data:

## 1. Get Connection String
- Go to your Supabase project dashboard
- Navigate to Settings → Database
- Copy the connection string (use the "Direct connection" string)

## 2. Export Schema Only
```bash
pg_dump "your-connection-string" --schema-only --no-owner --no-privileges > schema.sql
```

## 3. Export Data Only
```bash
pg_dump "your-connection-string" --data-only --no-owner --no-privileges > data.sql
```

## 4. Export Specific Tables
```bash
pg_dump "your-connection-string" --data-only --table=public.user_profiles --table=public.buddies --table=public.buddy_messages --table=public.whispr_notes --table=public.user_preferences > specific_tables.sql
```

## 5. Import to New Project
```bash
psql "new-project-connection-string" < schema.sql
psql "new-project-connection-string" < data.sql
```

## Alternative: Export as CSV
```bash
psql "your-connection-string" -c "\COPY public.user_profiles TO 'user_profiles.csv' WITH CSV HEADER;"
psql "your-connection-string" -c "\COPY public.buddies TO 'buddies.csv' WITH CSV HEADER;"
psql "your-connection-string" -c "\COPY public.buddy_messages TO 'buddy_messages.csv' WITH CSV HEADER;"
psql "your-connection-string" -c "\COPY public.whispr_notes TO 'whispr_notes.csv' WITH CSV HEADER;"
psql "your-connection-string" -c "\COPY public.user_preferences TO 'user_preferences.csv' WITH CSV HEADER;"
```


