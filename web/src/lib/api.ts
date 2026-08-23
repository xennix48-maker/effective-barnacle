import { supabase } from './supabase';

export type UserProfile = {
  id: string;
  telegram_id: number | null;
  first_name: string | null;
  username: string | null;
  is_admin: boolean;
};

export type MachineLevel = {
  level: string;
  name: string;
  price_mmk: number;
  daily_mmk: number;
  rate_per_sec: number;
  sort_order: number;
};

export type UserMachine = {
  id: string;
  level: string;
  status: 'pending' | 'active' | 'rejected';
  start_time: string | null;
  reject_reason: string | null;
  requested_at: string;
  price_paid_mmk: number;
};

export type BalanceSnapshot = {
  base_balance: number;
  rate_per_sec_total: number;
  earliest_start: string | null;
};

export type Settings = {
  drop_enabled: boolean;
  refer_bonus_mmk: number;
  payment_numbers: {
    wave: { phone: string; name: string };
    kbz: { phone: string; name: string };
  };
};

export type Transaction = {
  id: string;
  kind: 'purchase' | 'drop' | 'referral_bonus';
  amount_mmk: number;
  status: 'pending' | 'approved' | 'rejected';
  payment_method?: 'wave' | 'kbz' | null;
  phone?: string | null;
  account_name?: string | null;
  last6?: string | null;
  note?: string | null;
  reject_reason?: string | null;
  created_at: string;
  decided_at?: string | null;
  user_id?: string;
  telegram_id?: number;
  first_name?: string;
  username?: string;
  related_machine?: string | null;
};

export async function fetchMachineCatalog(): Promise<MachineLevel[]> {
  const { data, error } = await supabase
    .from('machines_catalog')
    .select('level,name,price_mmk,daily_mmk,sort_order')
    .eq('active', true)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    price_mmk: Number(row.price_mmk),
    daily_mmk: Number(row.daily_mmk),
    rate_per_sec: Number(row.daily_mmk) / 86400,
  }));
}

export async function fetchUserMachines(userId: string): Promise<UserMachine[]> {
  const { data, error } = await supabase
    .from('user_machines')
    .select('id,level,status,start_time,reject_reason,requested_at,price_paid_mmk')
    .eq('user_id', userId)
    .order('requested_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as UserMachine[];
}

/**
 * Fetches the caller's profile row. Used as a fallback when the JWT doesn't
 * carry the telegram_id / is_admin claims (Custom Access Token Hook inactive).
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id,telegram_id,first_name,username,is_admin')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    telegram_id: data.telegram_id != null ? Number(data.telegram_id) : null,
    first_name: data.first_name ?? null,
    username: data.username ?? null,
    is_admin: Boolean(data.is_admin),
  };
}

export async function fetchBalanceSnapshot(userId: string): Promise<BalanceSnapshot | null> {
  const { data, error } = await supabase
    .from('v_user_balance_snapshot')
    .select('base_balance,rate_per_sec_total,earliest_start')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { base_balance: 0, rate_per_sec_total: 0, earliest_start: null };
  return {
    base_balance: Number(data.base_balance),
    rate_per_sec_total: Number(data.rate_per_sec_total),
    earliest_start: data.earliest_start as string | null,
  };
}

export async function fetchSettings(): Promise<Settings> {
  const { data, error } = await supabase.from('settings').select('key,value');
  if (error) throw error;
  const map = new Map<string, unknown>();
  for (const r of data ?? []) map.set(r.key, r.value);
  return {
    drop_enabled: Boolean(map.get('drop_enabled')),
    refer_bonus_mmk: Number(map.get('refer_bonus_mmk') ?? 5000),
    payment_numbers: (map.get('payment_numbers') as Settings['payment_numbers']) ?? {
      wave: { phone: '09758676468', name: 'PHYU PHYU WIN' },
      kbz: { phone: '09758676468', name: 'PHYU PHYU WIN' },
    },
  };
}

export async function updateSetting(key: string, value: unknown): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .update({ value: value as any })
    .eq('key', key);
  if (error) throw error;
}

export async function updateMachine(
  level: string,
  patch: { price_mmk?: number; daily_mmk?: number; active?: boolean; name?: string }
): Promise<void> {
  const { error } = await supabase.from('machines_catalog').update(patch as any).eq('level', level);
  if (error) throw error;
}

export async function submitPurchaseRequest(args: {
  userId: string;
  level: string;
  priceMmk: number;
  paymentMethod: 'wave' | 'kbz';
  phone: string;
  accountName: string;
  last6: string;
  note: string;
}): Promise<{ machineId: string; transactionId: string }> {
  // 1. Insert pending user_machine
  const { data: machine, error: mErr } = await supabase
    .from('user_machines')
    .insert({
      user_id: args.userId,
      level: args.level,
      price_paid_mmk: args.priceMmk,
      status: 'pending',
    })
    .select('id')
    .single();
  if (mErr) throw mErr;

  // 2. Insert pending transaction
  const { data: txn, error: tErr } = await supabase
    .from('transactions')
    .insert({
      user_id: args.userId,
      kind: 'purchase',
      amount_mmk: args.priceMmk,
      status: 'pending',
      payment_method: args.paymentMethod,
      phone: args.phone,
      account_name: args.accountName,
      last6: args.last6,
      note: args.note,
      related_machine: machine.id,
    })
    .select('id')
    .single();
  if (tErr) throw tErr;

  return { machineId: machine.id, transactionId: txn.id };
}

export async function submitDropRequest(args: {
  userId: string;
  amountMmk: number;
  paymentMethod: 'wave' | 'kbz';
  phone: string;
  accountName: string;
}): Promise<{ transactionId: string }> {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: args.userId,
      kind: 'drop',
      amount_mmk: args.amountMmk,
      status: 'pending',
      payment_method: args.paymentMethod,
      phone: args.phone,
      account_name: args.accountName,
    })
    .select('id')
    .single();
  if (error) throw error;
  return { transactionId: data.id };
}

export async function fetchPendingPurchases(): Promise<Transaction[]> {
  // Admin: query with related user info via a view-less approach (RLS gives admin access).
  const { data, error } = await supabase
    .from('transactions')
    .select(
      'id,kind,amount_mmk,status,payment_method,phone,account_name,last6,note,reject_reason,created_at,decided_at,user_id,related_machine'
    )
    .eq('kind', 'purchase')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Transaction[];
}

export async function fetchPendingDrops(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(
      'id,kind,amount_mmk,status,payment_method,phone,account_name,note,reject_reason,created_at,decided_at,user_id'
    )
    .eq('kind', 'drop')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Transaction[];
}

export async function approvePurchase(transactionId: string, approve: boolean, reason?: string) {
  const { data, error } = await supabase.functions.invoke('admin-approve-purchase', {
    body: { transaction_id: transactionId, approve, reason },
  });
  if (error) throw error;
  return data;
}

export async function approveDrop(transactionId: string, approve: boolean, reason?: string) {
  const { data, error } = await supabase.functions.invoke('admin-approve-drop', {
    body: { transaction_id: transactionId, approve, reason },
  });
  if (error) throw error;
  return data;
}

export async function fetchReferralStats(userId: string): Promise<{
  total_referrals: number;
  paid_referrals: number;
  total_bonus_mmk: number;
}> {
  // Single query joining referrals + bonus txns
  const { data: refs, error: rErr } = await supabase
    .from('referrals')
    .select('id,paid')
    .eq('referrer_id', userId);
  if (rErr) throw rErr;
  const total = refs?.length ?? 0;
  const paid = refs?.filter((r: any) => r.paid).length ?? 0;

  const { data: txns, error: tErr } = await supabase
    .from('transactions')
    .select('amount_mmk')
    .eq('user_id', userId)
    .eq('kind', 'referral_bonus')
    .eq('status', 'approved');
  if (tErr) throw tErr;
  const total_bonus = (txns ?? []).reduce((s: number, r: any) => s + Number(r.amount_mmk), 0);

  return { total_referrals: total, paid_referrals: paid, total_bonus_mmk: total_bonus };
}
