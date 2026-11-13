-- Keep the caller's RLS policies and derive identity from the authenticated JWT.
create or replace function public.change_purchase_approval(
  p_item_id text,
  p_approval_role text,
  p_approved boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id public.purchases."purchaseID"%type := p_item_id;
  v_purchase public.purchases%rowtype;
  v_user_id text := auth.uid()::text;
  v_approvers jsonb;
  v_slot jsonb;
  v_index integer;
  v_status text;
begin
  if v_user_id is null then
    raise sqlstate 'PT401' using message = 'Not authenticated';
  end if;
  if p_approval_role is null or p_approval_role = '' or p_approved is null then
    raise sqlstate 'PT400' using message = 'Missing approval role or action';
  end if;

  -- The lock lasts through the update. A waiting approver reads the committed
  -- list, rather than replacing it with a snapshot from before the first save.
  select * into v_purchase from public.purchases
    where "purchaseID" = v_id for update;
  if not found then
    raise sqlstate 'PT404' using message = 'Purchase not found';
  end if;

  if (p_approved and v_purchase.status not in ('needsAproval', 'needsApproval'))
    or (not p_approved and v_purchase.status not in ('needsAproval', 'needsApproval', 'approved'))
    or v_purchase.status is null then
    raise sqlstate 'PT409' using message = 'Order changed; refresh and try again';
  end if;

  -- approvers is a PostgreSQL jsonb[]; serialize it as a JSON array to edit it.
  v_approvers := coalesce(to_jsonb(v_purchase.approvers), '[]'::jsonb);
  select entry.value, (entry.ordinality - 1)::integer into v_slot, v_index
    from jsonb_array_elements(v_approvers) with ordinality as entry(value, ordinality)
    where entry.value->>'requiredRole' = p_approval_role
    order by entry.ordinality limit 1;
  if not found then
    raise sqlstate 'PT404' using message = 'Approval slot not found';
  end if;
  -- programDirector records who expedited the order, not a required approval.
  if p_approval_role = 'programDirector' then
    raise sqlstate 'PT409' using message = 'Approval changed; refresh and try again';
  end if;
  if coalesce((v_slot->>'approved')::boolean, false) = p_approved then
    raise sqlstate 'PT409' using message = 'Approval changed; refresh and try again';
  end if;
  if not p_approved and btrim(coalesce(v_slot->>'approver', '')) <> v_user_id then
    raise sqlstate 'PT403' using message = 'Only the original approver can withdraw';
  end if;

  v_approvers := jsonb_set(v_approvers, array[v_index::text],
    v_slot || jsonb_build_object('approved', p_approved,
      'approver', case when p_approved then v_user_id else '' end));
  v_status := case
    when not exists (select 1 from jsonb_array_elements(v_approvers) as entry(value)
      where entry.value->>'requiredRole' is distinct from 'programDirector'
        and not coalesce((entry.value->>'approved')::boolean, false)) then 'approved'
    when v_purchase.status = 'approved' then 'needsAproval'
    else v_purchase.status end;

  -- Convert back through the table's row type, including its native array type.
  v_purchase := jsonb_populate_record(v_purchase, jsonb_build_object('approvers', v_approvers));
  update public.purchases set approvers = v_purchase.approvers, status = v_status
    where "purchaseID" = v_id returning * into v_purchase;
  if not found then
    raise sqlstate 'PT403' using message = 'Approval update denied';
  end if;
  return to_jsonb(v_purchase);
end;
$$;

-- Edits may reset approvals or change expedite attribution. Reject their stale
-- snapshots under the same row lock so they cannot erase a concurrent approval.
create or replace function public.edit_purchase_if_unchanged(
  p_item_id text,
  p_expected jsonb,
  p_changes jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id public.purchases."purchaseID"%type := p_item_id;
  v_purchase public.purchases%rowtype;
  v_changes public.purchases%rowtype;
begin
  if auth.uid() is null then
    raise sqlstate 'PT401' using message = 'Not authenticated';
  end if;
  select * into v_purchase from public.purchases
    where "purchaseID" = v_id for update;
  if not found then
    raise sqlstate 'PT404' using message = 'Purchase not found';
  end if;
  if p_expected is null or not (p_expected ?& array['approvers', 'status', 'items', 'expidited', 'requestName', 'catagory', 'reason'])
    or not (to_jsonb(v_purchase) @> p_expected)
    -- Array containment ignores order and duplicates; equality is required here.
    or to_jsonb(v_purchase)->'approvers' is distinct from p_expected->'approvers'
    or to_jsonb(v_purchase)->'items' is distinct from p_expected->'items' then
    raise sqlstate 'PT409' using message = 'Order changed; refresh and try again';
  end if;
  v_changes := jsonb_populate_record(v_purchase, p_changes);
  update public.purchases set
    "requestName" = v_changes."requestName", requestor = v_changes.requestor,
    catagory = v_changes.catagory, status = v_changes.status, vendor = v_changes.vendor,
    reason = v_changes.reason, expidited = v_changes.expidited,
    items = v_changes.items, cost = v_changes.cost, approvers = v_changes.approvers
    where "purchaseID" = v_id returning * into v_purchase;
  if not found then
    raise sqlstate 'PT403' using message = 'Order update denied';
  end if;
  return to_jsonb(v_purchase);
end;
$$;

revoke all on function public.change_purchase_approval(text, text, boolean) from public, anon;
revoke all on function public.edit_purchase_if_unchanged(text, jsonb, jsonb) from public, anon;
grant execute on function public.change_purchase_approval(text, text, boolean) to authenticated;
grant execute on function public.edit_purchase_if_unchanged(text, jsonb, jsonb) to authenticated;
