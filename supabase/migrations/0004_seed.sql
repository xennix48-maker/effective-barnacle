-- 0004_seed.sql
-- Seed machine catalog and default settings.

insert into public.machines_catalog(level, name, price_mmk, daily_mmk, sort_order) values
  ('L1',    'BTC Miner L1',     25000,  2000, 1),
  ('L2',    'BTC Miner L2',     50000,  4000, 2),
  ('L3',    'BTC Miner L3',     84000,  7000, 3),
  ('L5',    'BTC Miner L5',    130000, 11000, 4),
  ('Super', 'BTC Miner Super', 200000, 24000, 5)
on conflict (level) do nothing;

insert into public.settings(key, value) values
  ('drop_enabled',     'false'::jsonb),
  ('refer_bonus_mmk',  '5000'::jsonb),
  ('payment_numbers',  jsonb_build_object(
    'wave', jsonb_build_object('phone', '09758676468', 'name', 'PHYU PHYU WIN'),
    'kbz',  jsonb_build_object('phone', '09758676468', 'name', 'PHYU PHYU WIN')
  ))
on conflict (key) do nothing;
