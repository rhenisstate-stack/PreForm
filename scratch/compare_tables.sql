DO $$
DECLARE
    rec RECORD;
    cnt BIGINT;
BEGIN
    CREATE TEMP TABLE IF NOT EXISTS _counts (tbl text PRIMARY KEY, num_rows bigint);
    TRUNCATE _counts;
    FOR rec IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename LOOP
        EXECUTE format('SELECT count(*) FROM %I', rec.tablename) INTO cnt;
        INSERT INTO _counts VALUES (rec.tablename, cnt);
    END LOOP;
END;
$$;
SELECT tbl, num_rows FROM _counts ORDER BY tbl;
