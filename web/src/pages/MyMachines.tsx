import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  fetchUserMachines,
  fetchMachineCatalog,
  type MachineLevel,
  type UserMachine,
} from '../lib/api';
import { formatMMK, formatMMKShort, formatDuration, formatDate } from '../lib/format';

type Tab = 'active' | 'pending' | 'rejected';

const TAB_META: Record<Tab, { label: string; icon: string }> = {
  active:   { label: 'အလုပ်လုပ်နေသော', icon: '⚡' },
  pending:  { label: 'စစ်ဆေးနေသော',  icon: '⏳' },
  rejected: { label: 'ငြင်းပယ်ထားသော', icon: '✕' },
};

export function MyMachines() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [machines, setMachines] = useState<UserMachine[]>([]);
  const [catalog, setCatalog] = useState<Map<string, MachineLevel>>(new Map());
  const [tab, setTab] = useState<Tab>('active');
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!user) return;
    void fetchUserMachines(user.id).then(setMachines);
    void fetchMachineCatalog().then((all) => {
      setCatalog(new Map(all.map((m) => [m.level, m])));
    });
  }, [user]);

  // 1Hz ticker so each active machine's "Accrued" is live.
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const list = machines.filter((m) => m.status === tab);

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
          <h1 className="page-header__title">ကျွန်ုပ်၏ စက်များ</h1>
          <p className="page-header__sub">
            စုစုပေါင်း {machines.length} စက်
          </p>
        </div>
      </div>

      {/* Tab strip */}
      <div className="tabs">
        {(['active', 'pending', 'rejected'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? 'tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            <span style={{ marginRight: 4 }}>{TAB_META[t].icon}</span>
            {TAB_META[t].label}
            <span style={{ marginLeft: 6, opacity: 0.7 }}>
              {machines.filter((m) => m.status === t).length}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {list.length === 0 ? (
        <div className="empty">
          <div className="empty__icon">📭</div>
          <h3 className="empty__title">ဤအမျိုးအစားတွင် စက်မရှိသေးပါ</h3>
          <p className="empty__sub">စက်အမျိုးအစားများကို ပင်မစာမျက်နှာတွင် ကြည့်ပါ။</p>
          <button
            className="btn btn--primary mt-16"
            onClick={() => navigate('/')}
          >
            စက်ဝယ်ရန် →
          </button>
        </div>
      ) : (
        <div className="stack">
          {list.map((m) => {
            const cat = catalog.get(m.level);
            const ratePerSec = cat ? Number(cat.daily_mmk) / 86400 : 0;
            const start = m.start_time ? new Date(m.start_time).getTime() : 0;
            const elapsedSec = start ? Math.max(0, (Date.now() - start) / 1000) : 0;
            const accrued = ratePerSec * elapsedSec;

            return (
              <article
                key={m.id}
                className={`umachine umachine--${m.status}`}
              >
                <header className="umachine__head">
                  <div className="umachine__id">
                    <span className="umachine__level">{m.level}</span>
                    <span className="umachine__name">{cat?.name ?? `Machine ${m.level}`}</span>
                  </div>
                  <span className={`badge umachine__badge umachine__badge--${m.status}`}>
                    {m.status === 'active' && '⚡ အလုပ်လုပ်နေသည်'}
                    {m.status === 'pending' && '⏳ စစ်ဆေးနေသည်'}
                    {m.status === 'rejected' && '✕ ငြင်းပယ်ပြီး'}
                  </span>
                </header>

                {m.status === 'active' && cat ? (
                  <>
                    <div className="umachine__accrued">
                      <span className="umachine__accrued-label">စုစုပေါင်း ဝင်ငွေ</span>
                      <span className="umachine__accrued-value">
                        {formatMMK(accrued)} <span className="text-sm text-dim">MMK</span>
                      </span>
                    </div>
                    <div className="umachine__rows">
                      <div className="umachine__row">
                        <span className="text-dim">ဝယ်ယူဈေး</span>
                        <b>{formatMMKShort(Number(m.price_paid_mmk))} MMK</b>
                      </div>
                      <div className="umachine__row">
                        <span className="text-dim">1 ရက် ဝင်ငွေ</span>
                        <b className="text-green">+{formatMMKShort(Number(cat.daily_mmk))} MMK</b>
                      </div>
                      <div className="umachine__row">
                        <span className="text-dim">Per-second</span>
                        <b className="text-accent">{formatMMK(ratePerSec)} MMK/s</b>
                      </div>
                      <div className="umachine__row umachine__row--meta">
                        <span className="text-mute">စတင်ချိန်</span>
                        <span>
                          {formatDate(m.start_time)} · {formatDuration(elapsedSec)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : null}

                {m.status === 'pending' ? (
                  <p className="umachine__note">
                    ⏳ Admin စစ်ဆေးနေပါသည်။ ခဏစောင့်ပါ။
                  </p>
                ) : null}

                {m.status === 'rejected' ? (
                  <div className="umachine__note umachine__note--error">
                    <strong>ငြင်းပယ်သည့်အကြောင်းအရင်း</strong>
                    <p>{m.reject_reason ?? '—'}</p>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}