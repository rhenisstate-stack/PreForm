SELECT (SELECT count(*) FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY' AND table_schema='public') AS fk_constraints,
       (SELECT count(*) FROM information_schema.sequences WHERE sequence_schema='public') AS sequences,
       (SELECT count(*) FROM information_schema.table_constraints WHERE constraint_type='UNIQUE' AND table_schema='public') AS unique_constraints,
       (SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND indexname ILIKE '%UserSessions%') AS session_indexes,
       (SELECT count(*) FROM pg_indexes WHERE schemaname='public') AS total_indexes;
