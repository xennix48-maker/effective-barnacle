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
  const { user, authError, outsideTelegram, insideTelegram } = useAuth();
  const { settings } = useSettings();
  const [machine, setMachine] = useState<MachineLevel | null>(null);
  const [method, setMethod] = useState<'wave' | 'kbz'>('wave');
  const [phone, setPhone] = useState('');
  const [last6, setLast6] = useState('');
  const [note, setNote] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
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
    if (!user) {
      pushToast('Sign-in required — Telegram auth failed. Reload the mini-app.', 'error');
      return;
    }
    if (!phone.trim()) {
      pushToast('ဖုန်းနံပါတ် ထည့်ပါ', 'error');
      return;
    }
    // last6 is optional — admin can match by phone or note if user omits it.
    if (last6.trim() && !/^\d{6}$/.test(last6.trim())) {
      pushToast('နောက်ဆုံး ၆ လုံးကို မှန်ကန်စွာ ထည့်ပါ', 'error');
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
        screenshot,
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
      {user ? null : (
        <div className="card" style={{ borderColor: 'rgba(247, 147, 26, 0.3)', background: 'rgba(247, 147, 26, 0.08)' }}>
          <div className="fw-700" style={{ marginBottom: 6 }}>⚠️ Sign-in required</div>
          <div className="text-dim text-sm">
            {outsideTelegram
              ? insideTelegram
                ? 'Telegram WebApp data is missing. Please reopen this app from the bot menu button or inline button — opening the link from a chat message does not start a Mini App session.'
                : 'Telegram WebApp data not detected. Open this app from inside Telegram via the bot menu.'
              : authError
                ? `Auth failed: ${authError}. Reload the mini-app to retry.`
                : 'Loading your account...'}
          </div>
          {outsideTelegram && insideTelegram ? (
            <a
              className="btn btn--primary btn--block mt-12"
              href={`https://t.me/${(import.meta.env.VITE_BOT_USERNAME as string) || 'BITCOIN_MINING_OFFICAL'}`}
            >
              🤖 Bot menu သို့ သွားမည်
            </a>
          ) : null}
          <a
            className="btn btn--ghost btn--block mt-12"
            href="https://t.me/BTC_MINER_SERVICE"
            target="_blank"
            rel="noopener noreferrer"
          >
            💬 Customer Service — အကူညီလိုပါက ဆက်သွယ်ပါ
          </a>
        </div>
      )}
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
          <label className="field__label">
            လွှဲငွေ Transaction နောက်ဆုံး ၆ လုံး <span className="text-mute text-sm">(optional)</span>
          </label>
          <input
            className="input input--mono"
            value={last6}
            onChange={(e) => setLast6(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            inputMode="numeric"
          />
        </div>

        <div className="field">
          <label className="field__label">မှတ်ချက် (optional)</label>
          <textarea
            className="textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="လွှဲငွေ reference အမှတ် စသည်"
            rows={2}
          />
        </div>

        <div className="field">
          <label className="field__label">
            Receipt Screenshot Upload <span className="text-mute text-sm">(optional)</span>
          </label>
          <label className="upload-box">
            <input
              type="file"
              accept="image/*"
              className="upload-box__input"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setScreenshot(f);
              }}
            />
            {screenshot ? (
              <div className="upload-box__preview">
                <img
                  src={URL.createObjectURL(screenshot)}
                  alt="receipt preview"
                  className="upload-box__img"
                />
                <div className="upload-box__meta">
                  <div className="text-sm fw-700">{screenshot.name}</div>
                  <div className="text-dim text-sm">
                    {(screenshot.size / 1024).toFixed(1)} KB
                  </div>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm mt-4"
                    onClick={() => setScreenshot(null)}
                  >
                    ✕ ဖယ်ရှားမည်
                  </button>
                </div>
              </div>
            ) : (
              <div className="upload-box__placeholder">
                <div className="upload-box__icon">📷</div>
                <div className="upload-box__hint">လွှဲငွေ screenshot ရွေးပါ</div>
                <div className="text-dim text-sm">JPG, PNG · max 5MB</div>
              </div>
            )}
          </label>
        </div>

        <button className="btn btn--primary btn--block" type="submit" disabled={submitting}>
          {submitting ? 'တင်နေသည်...' : 'ဝယ်ယူမှုတင်ပြမည် →'}
        </button>
      </form>
    </div>
  );
}