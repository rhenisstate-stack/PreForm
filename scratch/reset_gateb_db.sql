SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'prepford_gateb_verification' AND pid <> pg_backend_pid();
DROP DATABASE "prepford_gateb_verification";
CREATE DATABASE "prepford_gateb_verification";
