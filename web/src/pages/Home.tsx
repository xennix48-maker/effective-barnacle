import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { BalanceTicker } from '../components/BalanceTicker';
import { MachineCard } from '../components/MachineCard';
import { fetchMachineCatalog, type MachineLevel } from '../lib/api';

export function Home() {
  const { user, isAdmin, telegramId } = useAuth();
  const { settings } = useSettings();
  const [machines, setMachines] = useState<MachineLevel[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMachineCatalog()
      .then((rows) => setMachines(rows))
      .catch((err) => {
        // Surface the failure instead of letting the UI sit on skeletons forever.
        // eslint-disable-next-line no-console
        console.error('[home] fetchMachineCatalog failed', err);
        setCatalogError(err?.message ?? 'failed to load');
      })
      .finally(() => setCatalogLoaded(true));
  }, []);

  const botUsername =
    (import.meta.env.VITE_BOT_USERNAME as string) || 'BITCOIN_MINING_OFFICAL';
  const refLink = telegramId
    ? `https://t.me/${botUsername}?startapp=ref_${telegramId}`
    : '';
  const dropClosed = settings ? !settings.drop_enabled : false;

  return (
    <div className="app-shell">
      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero__brand">
          <div className="home-hero__logo">₿</div>
          <div>
            <h1 className="home-hero__title">Btcak</h1>
            <p className="home-hero__sub">Bitcoin Mining · Myanmar Kyat</p>
          </div>
        </div>

        <BalanceTicker userId={user?.id ?? null} />

        <div className="home-quick">
          <Link to="/machines" className="home-quick__btn">
            <div className="home-quick__icon home-quick__icon--green">⛏️</div>
            <span className="home-quick__label">စက်များ</span>
          </Link>
          <Link to="/drop" className="home-quick__btn">
            <div className="home-quick__icon home-quick__icon--amber">
              {dropClosed ? '🔒' : '💸'}
            </div>
            <span className="home-quick__label">Drop</span>
          </Link>
          <Link to="/refer" className="home-quick__btn">
            <div className="home-quick__icon home-quick__icon--blue">🔗</div>
            <span className="home-quick__label">Refer</span>
          </Link>
          {isAdmin ? (
            <Link to="/admin" className="home-quick__btn">
              <div className="home-quick__icon">⚙️</div>
              <span className="home-quick__label">Admin</span>
            </Link>
          ) : (
            <a
              href={`https://t.me/${(import.meta.env.VITE_BOT_USERNAME as string) || 'BITCOIN_MINING_OFFICAL'}`}
              target="_blank"
              rel="noreferrer"
              className="home-quick__btn"
            >
              <div className="home-quick__icon">✈️</div>
              <span className="home-quick__label">Telegram</span>
            </a>
          )}
        </div>
      </section>

      {/* Refer banner */}
      {refLink ? (
        <button
          type="button"
          className="home-refer-banner"
          onClick={() => navigate('/refer')}
        >
          <div>
            <div className="home-refer-banner__title">
              🎁 သူငယ်ချင်းဖိတ်ပါ — 5,000 MMK
            </div>
            <div className="home-refer-banner__sub">
              1 ယောက်ဖိတ်ရင် 5,000 MMK · ကန့်သတ်မရှိ
            </div>
          </div>
          <span className="home-refer-banner__arrow">→</span>
        </button>
      ) : null}

      {/* Machine catalog */}
      <section className="home-section">
        <div className="home-section__head">
          <h2 className="home-section__title">
            <span aria-hidden>⛏️</span> စက်အမျိုးအစားများ
          </h2>
          <span className="home-section__sub">{machines.length} မျိုး</span>
        </div>
        <div className="home-machines">
          {catalogError ? (
            <div className="card card--warn">
              <div className="fw-700">စက်များ ရယူမရပါ</div>
              <div className="text-dim text-sm mt-4">{catalogError}</div>
              <button
                className="btn btn--ghost mt-12"
                onClick={() => {
                  setCatalogError(null);
                  setCatalogLoaded(false);
                  fetchMachineCatalog()
                    .then(setMachines)
                    .catch((err) => setCatalogError(err?.message ?? 'failed'))
                    .finally(() => setCatalogLoaded(true));
                }}
              >
                ထပ်ကြိုးစားမည်
              </button>
            </div>
          ) : machines.length === 0 && !catalogLoaded ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 240 }} />
            ))
          ) : machines.length === 0 ? (
            <div className="card">
              <div className="text-dim">စက်များ မရှိသေးပါ</div>
            </div>
          ) : (
            machines.map((m) => <MachineCard key={m.level} machine={m} />)
          )}
        </div>
      </section>
    </div>
  );
}