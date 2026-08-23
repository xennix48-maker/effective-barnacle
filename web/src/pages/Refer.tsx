import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchReferralStats } from '../lib/api';
import { pushToast } from '../components/Toast';
import { shareUrl, hapticImpact } from '../lib/telegram';
import { formatMMKShort } from '../lib/format';

export function Refer() {
  const { user, telegramId } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<{
    total_referrals: number;
    paid_referrals: number;
    total_bonus_mmk: number;
  } | null>(null);

  const botUsername =
    (import.meta.env.VITE_BOT_USERNAME as string) || 'BITCOIN_MINING_OFFICAL';
  const refLink = telegramId
    ? `https://t.me/${botUsername}?startapp=ref_${telegramId}`
    : '';

  useEffect(() => {
    if (!user) return;
    void fetchReferralStats(user.id).then(setStats);
  }, [user]);

  function copyLink() {
    if (!refLink) return;
    navigator.clipboard.writeText(refLink).then(
      () => pushToast('Link ကူးပြီးပါပြီ', 'success'),
      () => pushToast('ကူး၍ မရပါ', 'error')
    );
  }

  function shareToTelegram() {
    if (!refLink) return;
    hapticImpact('medium');
    shareUrl(
      refLink,
      '🎁 Btcak — Bitcoin Mining ကနေ ကျွန်တော်တို့ အတူတူ ရင်းနှီးကျွမ်းဝင်မယ်\n' +
        '⛏️ 5 မျိုးသော Mining Machine ရွေးချယ်ဝယ်ယူနိုင်ပြီး\n' +
        '💸 ဖိတ်လိုက်တိုင်း 5,000 MMK (ကန့်သတ်မရှိ)\n' +
        '👇 ဒီ link နှိပ်ပြီး အကောင့်ဖွင့်လိုက်ပါ — ငါ့ကို ဆုကြေး ရပါမယ်'
    );
  }

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
          <h1 className="page-header__title">သူငယ်ချင်းဖိတ်ပါ</h1>
          <p className="page-header__sub">ဖိတ်လိုက်တိုင်း 5,000 MMK</p>
        </div>
      </div>

      {/* Hero card */}
      <section className="refer-hero">
        <div className="refer-hero__icon">🎁</div>
        <h2 className="refer-hero__title">ဖိတ်လိုက်တဲ့အတွက် ကန့်သတ်မရှိ</h2>
        <p className="refer-hero__sub">
          သင့်လင့်ခ်မှ လာသော သူငယ်ချင်း စက်ဝယ်ပြီးကျရင် 5,000 MMK ရပါမည်။
          ဖိတ်လိုက်တဲ့အတွက် အကုန်ယူပါ။
        </p>
      </section>

      {/* Link card */}
      {refLink ? (
        <div className="refer-link-card">
          <div className="refer-link-card__head">
            <span className="refer-link-card__label">သင့်ဖိတ်စာ Link</span>
            <span className="badge badge--green">Active</span>
          </div>
          <div className="refer-link-card__link">{refLink}</div>
          <div className="refer-link-card__actions">
            <button className="btn btn--primary" onClick={copyLink}>
              📋 ကူးမည်
            </button>
            <button className="btn btn--ghost" onClick={shareToTelegram}>
              ✈️ Telegram မျှဝေ
            </button>
          </div>
        </div>
      ) : null}

      {/* Stats */}
      {stats ? (
        <section>
          <h3 className="home-section__title mt-8">သင့်ရလဒ်</h3>
          <div className="stat-grid mt-12">
            <div className="stat stat--blue">
              <div className="stat__label">စုစုပေါင်း ဖိတ်ထားသူ</div>
              <div className="stat__value">{stats.total_referrals}</div>
              <div className="stat__sub">လူများ</div>
            </div>
            <div className="stat stat--green">
              <div className="stat__label">အောင်မြင်သူ</div>
              <div className="stat__value">{stats.paid_referrals}</div>
              <div className="stat__sub">စက်ဝယ်ပြီးသူ</div>
            </div>
          </div>
          <div className="card mt-12" style={{ textAlign: 'center' }}>
            <div className="text-dim text-sm">ရရှိထားသော ဆုကြေး</div>
            <div
              className="text-2xl fw-800 text-accent mt-4"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {formatMMKShort(stats.total_bonus_mmk)} MMK
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}