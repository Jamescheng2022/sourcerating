-- OWNER runs this ONCE on the synthetic tenant (project ref nunojlfangvnjlwggvvb) — never on production.
-- Replace :PASSWORD with a generated secret and store it only in the Windows B machine-level environment
-- as ORACLE_DATABASE_URL. Do not paste it in chat or commit it.
create role qa_oracle_ro login password :'PASSWORD' nosuperuser nocreatedb nocreaterole noinherit;
grant usage on schema public, storage to qa_oracle_ro;
grant select on all tables in schema public to qa_oracle_ro;
grant select on storage.objects to qa_oracle_ro;
grant temp on database postgres to qa_oracle_ro;
-- needed only for the row-level-security probe (set local role authenticated) inside a rolled-back transaction:
grant authenticated to qa_oracle_ro;
