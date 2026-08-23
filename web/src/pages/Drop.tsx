import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { useLiveBalance } from '../hooks/useLiveBalance';
import { submitDropRequest } from '../lib/api';
import { pushToast } from '../components/Toast';
import { formatMMK, formatMMKShort } from '../lib/format';

export function Drop() {
  const { user, telegramId } = useAuth();
  const { settings, loading } = useSettings();
  const { display, refresh } = useLiveBalance(user?.id ?? null);
  const navigate = useNavigate();
  const [method, setMethod] = useState<'wave' | 'kbz'>('wave');
  const [phone, setPhone] = useState('');
  const [accountName, setAccountName] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && settings && !settings.drop_enabled) {
      // Show waiting screen
    }
  }, [loading, settings]);

  if (loading) {
    return (
      <div className="page">
        <p>ခဏစောင့်ပါ...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="page">
        <p>Settings load မရပါ။</p>
        <button onClick={() => navigate('/')}>ပြန်သွ�းမည်</button>
      </div>
    );
  }

  if (!settings.drop_enabled) {
    return (
      <div className="page page--centered">
        <div className="drop-closed-card">
          <div className="drop-closed-card__icon">⏳</div>
          <h2>Admin က Drop ဖွင့်ပေးတာ စောင့်ပါ</h2>
          <p>
            Drop (ငွေထုတ်ယူခြင်း) ကို Admin က ဖွင့်ပေ�မှသာ အသုံးပြုနိုင်ပါသည�။
            ခဏကြာတဲ့နောက် ပြန�လာစစ်ပါ။
          </p>
        </div>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      pushToast('ပမာဏ မှန်ကန်စွာ ထည့်ပါ', 'error');
      return;
    }
    if (amt > display) {
      pushToast('လက်ကျန်ငွေ မလုံလောက်ပါ', 'error');
      return;
    }
    if (!phone.trim() || !accountName.trim()) {
      pushToast('ဖုန်းနံပါ�်နှင့် အမည် �ြည့်ပါ', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await submitDropRequest({
        userId: user.id,
        amountMmk: amt,
        paymentMethod: method,
        phone: phone.trim(),
        accountName: accountName.trim(),
      });
      pushToast('Drop တင်ပြီးပါပြီ။ Admin စစ်ဆေးပ�ီးမှ ငွေပို့ပါမည်။', 'success');
      setAmount('');
      refresh();
    } catch (e: any) {
      pushToast(`မ�ောင်မြင်ပ�: ${e?.message ?? 'unknown'}`, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate(-1)}>← ပြ�်သွားမည်</button>
      <h1 className="page-title">Drop — ငွေထ�တ်ယူရန်</h1>
      <div className="drop-balance-card">
        <span className="drop-balance-card__label">လ�်ရှိလက်ကျန�ငွေ</span>
        <span className="drop-balance-card__value">{formatMMKShort(display)} MMK</span>
      </div>

      <form className="buy-form" onSubmit={onSubmit}>
        <label className="form-label">င�ေလက်ခံမည့် �ည်းလမ်း</label>
        <div className="method-toggle">
          <button
            type="button"
            className={`method-toggle__btn ${method === 'wave' ? 'method-toggle__btn--active' : ''}`}
            onClick={() => setMethod('wave')}
          >Wave Money</button>
          <button
            type="button"
            className={`method-toggle__btn ${method === 'kbz' ? 'method-toggle__btn--active' : ''}`}
            onClick={() => setMethod('kbz')}
          >KBZ Pay</button>
        </div>

        <label className="form-label">သင့် Wave / KBZ �ုန်းနံပါတ်</label>
        <input
          className="form-input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="09xxxxxxxxx"
          inputMode="tel"
        />

        <label className="form-label">ငွေလက်ခံမည့် အမ�်</label>
        <input
          className="form-input"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          placeholder="အမည်"
        />

        <label className="form-label">ပ�ာဏ (MMK)</label>
        <input
          className="form-input"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
          placeholder="0"
          inputMode="decimal"
        />
        <p className="form-hint">Drop ပမာဏ ≤ {formatMMK(display)} MMK</p>

        <button className="cta-btn" type="submit" disabled={submitting || !telegramId}>
          {submitting ? 'တင်နေသည်...' : 'Drop တင်ပြမည်'}
        </button>
      </form>
    </div>
  );
}
