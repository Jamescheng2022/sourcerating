-- L1 stage 2 (2026-10-10): new environments must not let signed-in users
-- self-claim a demo buyer/supplier role. Migrations 202609250003:86 and
-- 202609260002:84 grant claim_p1_demo_role to authenticated; this removes it,
-- matching the production containment (tasks/evidence/stage2-containment-20261007).
-- No migration in between can be reached by a user: nobody is signed in while
-- migrations run on a fresh database.

revoke execute on function public.claim_p1_demo_role(text) from public, anon, authenticated;

do $$
begin
  if has_function_privilege('authenticated', 'public.claim_p1_demo_role(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.claim_p1_demo_role(text)', 'EXECUTE') then
    raise exception 'claim_p1_demo_role is still executable by anon/authenticated';
  end if;
end $$;
