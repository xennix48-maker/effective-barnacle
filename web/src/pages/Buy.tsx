import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { PaymentInstructions } from '../components/PaymentInstructions';
import {
  fetchMachineCatalog,
  submitPurchaseRequest,
  type MachineLevel,
} from '../lib/api';
import { pushToast } from '../components/Toast';
import { formatMMK, formatMMKShort } from '../lib/format';

export function Buy() {
  const { level } = useParams<{ level: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();
  const [machine, setMachine] = useState<MachineLevel | null>(null);
  const [method, setMethod] = useState<'wave' | 'kbz'>('wave');
  const [phone, setPhone] = useState('');
  const [last6, setLast6] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchMachineCatalog().then((all) => {
      const m = all.find((x) => x.level === level);
      setMachine(m ?? null);
    });
  }, [level]);

  if (!machine) {
    return (
      <div className="app-shell">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← ပြန်သွားမည်
        </button>
        <div className="empty">
          <div className="empty__icon">😕</div>
          <h3 className="empty__title">စက်မတွေ့ပါ</h3>
          <p className="empty__sub">ဤအဆင့်ကို catalog တွင် မတွေ့ရှိပါ။</p>
        </div>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!/^\d{6}$/.test(last6)) {
      pushToast('နောက်ဆုံး ၆ လုံးကို မှန်ကန်စွာ ထည့်ပါ', 'error');
      return;
    }
    if (!phone.trim()) {
      pushToast('ဖုန်းနံပါတ် ထည့်ပါ', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await submitPurchaseRequest({
        userId: user.id,
        level: machine!.level,
        priceMmk: Number(machine!.price_mmk),
        paymentMethod: method,
        phone: phone.trim(),
        accountName: user.user_metadata?.first_name ?? '',
        last6: last6.trim(),
        note: note.trim(),
      });
      pushToast('ဝယ်ယူမှုတင်ပြီးပါပြီ။ Admin စစ်ဆေးပြီးမှ စက်အလုပ်လုပ်မည်။', 'success');
      navigate('/machines');
    } catch (e: any) {
      pushToast(`မအောင်မြင်ပါ: ${e?.message ?? 'unknown'}`, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const dailyReturnPct = ((machine.daily_mmk / machine.price_mmk) * 100).toFixed(2);
  const paybackDays = (machine.price_mmk / machine.daily_mmk).toFixed(1);

  return (
    <div className="app-shell">
      {/* Header */}
      <div className="page-header">
        <button
          className="page-header__back"
          onClick={() => navigate(-1)}
          aria-label="ပြန်သွားမည်"
        >
          ←
        </button>
        <div>
          <h1 className="page-header__title">{machine.name}</h1>
          <p className="page-header__sub">
            Level {machine.level} · {formatMMKShort(machine.price_mmk)} MMK
          </p>
        </div>
      </div>

      {/* Hero summary */}
      <section className="buy-hero">
        <div className="buy-hero__top">
          <span className="badge badge--accent">⛏️ Mining Machine</span>
          <span className="buy-hero__level">{machine.level}</span>
        </div>
        <div className="buy-hero__price">
          {formatMMKShort(machine.price_mmk)} <span className="text-md text-dim">MMK</span>
        </div>
        <div className="buy-hero__earn">+{formatMMKShort(machine.daily_mmk)} MMK / ရက်</div>

        <div className="buy-hero__stats">
          <div className="buy-hero__stat">
            <div className="buy-hero__stat-label">Per-second</div>
            <div className="buy-hero__stat-value text-accent">
              {formatMMK(machine.rate_per_sec)} MMK/s
            </div>
          </div>
          <div className="buy-hero__stat">
            <div className="buy-hero__stat-label">ပြန်ဆပ်ရက်</div>
            <div className="buy-hero__stat-value">{paybackDays} ရက်</div>
          </div>
          <div className="buy-hero__stat">
            <div className="buy-hero__stat-label">နေ့စဉ် %</div>
            <div className="buy-hero__stat-value text-green">{dailyReturnPct}%</div>
          </div>
        </div>
      </section>

      {/* Payment instructions */}
      {settings ? (
        <PaymentInstructions
          amount={Number(machine.price_mmk)}
          numbers={settings.payment_numbers}
          method={method}
        />
      ) : null}

      {/* Form */}
      <form className="buy-form" onSubmit={onSubmit}>
        <h2 className="buy-form__title">ငွေပေးချေမှု အချက်အလက်</h2>

        <div className="field">
          <label className="field__label">ငွေပေးချေမှုနည်းလမ်း</label>
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
          <label className="field__label">သင့်ဖုန်းနံပါတ်</label>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09xxxxxxxxx"
            inputMode="tel"
          />
        </div>

        <div className="field">
          <label className="field__label">လွှဲငွေ Transaction နောက်ဆုံး ၆ လုံး</label>
          <input
            className="input input--mono"
            value={last6}
            onChange={(e) => setLast6(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            inputMode="numeric"
          />
        </div>

        <div className="field">
          <label className="field__label">မှတ်ချက် (ရည်ညွှန်း/ပုံ URL ရွေးချယ်၍ဖြစ်ဖြစ်)</label>
          <textarea
            className="textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Screenshot link, account name, etc."
            rows={2}
          />
        </div>

        <button className="btn btn--primary btn--block" type="submit" disabled={submitting}>
          {submitting ? 'တင်နေသည်...' : 'ဝယ်ယူမှုတင်ပြမည် →'}
        </button>
      </form>
    </div>
  );
}