-- Índices que cubren las llaves foráneas compuestas (columna, user_id)
drop index if exists public.categories_parent_idx;
drop index if exists public.planned_items_account_idx;
drop index if exists public.planned_items_to_account_idx;
drop index if exists public.planned_items_category_idx;
drop index if exists public.transactions_account_date_idx;
drop index if exists public.transactions_to_account_idx;
drop index if exists public.transactions_category_idx;

create index categories_parent_fk_idx       on public.categories (parent_id, user_id, kind);
create index planned_items_account_fk_idx   on public.planned_items (account_id, user_id);
create index planned_items_to_account_fk_idx on public.planned_items (to_account_id, user_id);
create index planned_items_category_fk_idx  on public.planned_items (category_id, user_id);
create index transactions_account_fk_idx    on public.transactions (account_id, user_id, date);
create index transactions_to_account_fk_idx on public.transactions (to_account_id, user_id);
create index transactions_category_fk_idx   on public.transactions (category_id, user_id);
create index transactions_planned_fk_idx    on public.transactions (planned_item_id, user_id);
