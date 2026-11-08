-- Called only by the backend service client, which can see every purchase.
create or replace function public.recalculate_category_spent(p_category_id text)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  -- Serialize recalculations for this category before reading purchases. Keep
  -- the lock and sum in separate commands: at READ COMMITTED the sum gets a
  -- fresh snapshot after any previous recalculation releases the row lock.
  perform 1 from public.budget
    where "categoryID" = p_category_id for update;
  if not found then
    return;
  end if;

  update public.budget set "categorySpent" = (
    -- Preserve per-purchase cent rounding, including Math.round's tie behavior.
    select coalesce(sum(floor(coalesce(cost::numeric, 0) * 100 + 0.5)), 0) / 100
    from public.purchases
    where catagory = p_category_id
      and status in ('purchased', 'recived', 'selfPurchased')
  ) where "categoryID" = p_category_id;
end;
$$;

revoke all on function public.recalculate_category_spent(text) from public, anon, authenticated;
grant execute on function public.recalculate_category_spent(text) to service_role;
