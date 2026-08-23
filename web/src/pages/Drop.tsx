import { useState } from 'react';
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

  if (loading) {
    return (
      <div className="app-shell">
        <div className="empty">
          <div className="spinner" style={{ margin: '0 auto 8px' }} />
          <p className="text-dim">Settings load နေသည်...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="app-shell">
        <button className="back-btn" onClick={() => navigate('/')}>← ပြန်သွားမည်</button>
        <div className="empty">
          <div className="empty__icon">⚠️</div>
          <h3 className="empty__title">Settings load မရပါ</h3>
          <p className="empty__sub">ခဏကြာပြီးမှ ပြန်လာပါ။</p>
        </div>
      </div>
    );
  }

  if (!settings.drop_enabled) {
    return (
      <div className="app-shell">
        <div className="page-header">
          <button
            className="page-header__back"
            onClick={() => navigate(-1)}
            aria-label="ပြန်သွားမည်"
          >
            ←
          </button>
          <div>
            <h1 className="page-header__title">Drop</h1>
            <p className="page-header__sub">ငွေထုတ်ယူရန်</p>
          </div>
        </div>
        <div className="drop-closed-card" style={{ margin: '40px auto' }}>
          <div className="drop-closed-card__icon">🔒</div>
          <h2 className="fw-700">Admin က Drop ဖွင့်ပေးတာ စောင့်ပါ</h2>
          <p className="text-dim mt-12">
            Drop (ငွေထုတ်ယူခြင်း) ကို Admin က ဖွင့်ပေးမှသာ အသုံးပြုနိုင်ပါသည်။
            ခဏကြာတဲ့နောက် ပြန်လာစစ်ပါ။
          </p>
          <div className="badge badge--amber mt-16">
            ⏳ စောင့်ဆိုင့်နေသည်
          </div>
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
      pushToast('ဖုန်းနံပါတ်နှင့် အမည် ဖြည့်ပါ', 'error');
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
      pushToast('Drop တင်ပြီးပါပြီ။ Admin စစ်ဆေးပြီးမှ ငွေပို့ပါမည်။', 'success');
      setAmount('');
      refresh();
    } catch (e: any) {
      pushToast(`မအောင်မြင်ပါ: ${e?.message ?? 'unknown'}`, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const amtNum = Number(amount) || 0;
  const afterDrop = Math.max(0, display - amtNum);

  return (
    <div className="app-shell">
      <div className="page-header">
        <button
          className="page-header__back"
          onClick={() => navigate(-1)}
          aria-label="ပြန်သွားမည်"
        >
          ←
        </button>
        <div>
          <h1 className="page-header__title">Drop</h1>
          <p className="page-header__sub">ငွေထုတ်ယူရန်</p>
        </div>
      </div>

      {/* Balance card */}
      <section className="drop-balance">
        <div className="drop-balance__label">လက်ရှိ လက်ကျန်ငွေ</div>
        <div className="drop-balance__value">
          {formatMMKShort(display)} <span className="text-md text-dim">MMK</span>
        </div>
        {amtNum > 0 ? (
          <div className="drop-balance__after">
            ထုတ်ပြီးနောက် → <b>{formatMMKShort(afterDrop)} MMK</b>
          </div>
        ) : null}
      </section>

      <form className="buy-form" onSubmit={onSubmit}>
        <h2 className="buy-form__title">Drop အချက်အလက်</h2>

        <div className="field">
          <label className="field__label">ငွေလက်ခံမည့် နည်းလမ်း</label>
          <div className="method-toggle">
            <button
              type="button"
              className={`method-toggle__btn ${method === 'wave' ? 'method-toggle__btn--active' : ''}`}
              onClick={() => setMethod('wave')}
            >
              <span className="method-toggle__icon">🌊</span>
              Wave Money
            </button>
            <button
              type="button"
              className={`method-toggle__btn ${method === 'kbz' ? 'method-toggle__btn--active' : ''}`}
              onClick={() => setMethod('kbz')}
            >
              <span className="method-toggle__icon">💳</span>
              KBZ Pay
            </button>
          </div>
        </div>

        <div className="field">
          <label className="field__label">သင့် Wave / KBZ ဖုန်းနံပါတ်</label>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09xxxxxxxxx"
            inputMode="tel"
          />
        </div>

        <div className="field">
          <label className="field__label">ငွေလက်ခံမည့် အမည်</label>
          <input
            className="input"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="အမည်"
          />
        </div>

        <div className="field">
          <label className="field__label">ပမာဏ (MMK)</label>
          <input
            className="input input--mono"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="0"
            inputMode="decimal"
          />
          <p className="text-mute text-sm mt-4">
            Drop ပမာဏ ≤ {formatMMK(display)} MMK
          </p>
        </div>

        <button
          className="btn btn--primary btn--block"
          type="submit"
          disabled={submitting || !telegramId}
        >
          {submitting ? 'တင်နေသည်...' : '💸 Drop တင်ပြမည်'}
        </button>
      </form>
    </div>
  );
}