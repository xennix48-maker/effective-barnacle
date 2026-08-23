import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchReferralStats } from '../lib/api';
import { pushToast } from '../components/Toast';
import { openLink } from '../lib/telegram';
import { formatMMKShort } from '../lib/format';

export function Refer() {
  const { user, telegramId } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<{ total_referrals: number; paid_referrals: number; total_bonus_mmk: number } | null>(null);
  const botUsername = (import.meta.env.VITE_BOT_USERNAME as string) || 'BITCOIN_MININGMACHINE_BOT';
  const refLink = telegramId ? `https://t.me/${botUsername}?startapp=ref_${telegramId}` : '';

  useEffect(() => {
    if (!user) return;
    void fetchReferralStats(user.id).then(setStats);
  }, [user]);

  function copyLink() {
    if (!refLink) return;
    navigator.clipboard.writeText(refLink).then(
      () => pushToast('Link ကူးပြီးပါပြီ', 'success'),
      () => pushToast('ကူး� မရပါ', 'error')
    );
  }

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate(-1)}>← ပြန်သ�ားမည်</button>
      <h1 className="page-title">သူငယ်ချင်းဖိတ်ပါ</h1>
      <p className="page-subtitle">
        သင့်လင့်ခ်မှ လာသော သူငယ်ချင်� စက်ဝယ်ပြီးကျရင် 5,000 MMK ရပါမည်။
        ကန့်သတ်မရှိ — ဖ�တ်လိုက်တဲ့အတွက် အကုန်ယူပါ။
      </p>

      {refLink ? (
        <div className="refer-link-card">
          <div className="refer-link-card__label">သင့်ဖိတ်စာ Link</div>
          <div className="refer-link-card__link">{refLink}</div>
          <div className="refer-link-card__actions">
            <button className="cta-btn cta-btn--inline" onClick={copyLink}>ကူးမည်</button>
            <button className="cta-btn cta-btn--inline cta-btn--secondary" onClick={() => openLink(refLink)}>
              Telegram ဖြင့်မျှဝေမည်
            </button>
          </div>
        </div>
      ) : null}

      {stats ? (
        <div className="refer-stats">
          <div className="refer-stats__row">
            <span>စုစုပေါင်း ဖိတ်�ားသူ</span>
            <b>{stats.total_referrals}</b>
          </div>
          <div className="refer-stats__row">
            <span>အောင်မြင်သူ (စက်ဝယ်ပြ�း)</span>
            <b>{stats.paid_referrals}</b>
          </div>
          <div className="refer-stats__row refer-stats__row--big">
            <span>ရရှိထားသော ဆုကြေး</span>
            <b style={{ color: '#f7931a' }}>{formatMMKShort(stats.total_bonus_mmk)} MMK</b>
          </div>
        </div>
      ) : null}
    </div>
  );
}
