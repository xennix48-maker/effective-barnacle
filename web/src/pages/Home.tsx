import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { BalanceTicker } from '../components/BalanceTicker';
import { MachineCard } from '../components/MachineCard';
import { fetchMachineCatalog, type MachineLevel } from '../lib/api';

export function Home() {
  const { user, isAdmin, telegramId } = useAuth();
  const { settings } = useSettings();
  const [machines, setMachines] = useState<MachineLevel[]>([]);

  useEffect(() => {
    void fetchMachineCatalog().then(setMachines);
  }, []);

  const botUsername = (import.meta.env.VITE_BOT_USERNAME as string) || 'BITCOIN_MININGMACHINE_BOT';
  const refLink = telegramId
    ? `https://t.me/${botUsername}?startapp=ref_${telegramId}`
    : '';

  return (
    <div className="page page--home">
      <BalanceTicker userId={user?.id ?? null} />

      {refLink ? (
        <Link to="/refer" className="home-refer-banner">
          <div>
            <div className="home-refer-banner__title">သူငယ်ချင်းဖိတ်ပါ — 5,000 MMK ရမည်</div>
            <div className="home-refer-banner__sub">
              1 ယောက်ဖိတ်ရင် 5,000 MMK · ကန့်သတ်မရှိ
            </div>
          </div>
          <span>→</span>
        </Link>
      ) : null}

      <div className="home-actions">
        <Link to="/machines" className="home-actions__btn">ကျွန်ုပ်၏ စက်များ</Link>
        <Link
          to="/drop"
          className={`home-actions__btn ${settings && !settings.drop_enabled ? 'home-actions__btn--muted' : ''}`}
        >
          Drop{settings && !settings.drop_enabled ? ' (ပိတ်ထား)' : ''}
        </Link>
        {isAdmin ? (
          <Link to="/admin" className="home-actions__btn home-actions__btn--admin">
            Admin Panel
          </Link>
        ) : null}
      </div>

      <h2 className="home-section-title">စက်�မျိုးအစား�ျား</h2>
      <div className="home-machine-grid">
        {machines.map((m) => (
          <MachineCard key={m.level} machine={m} />
        ))}
      </div>
    </div>
  );
}
