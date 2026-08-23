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

  // Per-second ticker so each active machine's "Accrued" line is live.
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const list = machines.filter((m) => m.status === tab);

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate(-1)}>← ပြန်သွာ�မည်</button>
      <h1 className="page-title">ကျွန်ုပ်၏ �က်များ</h1>

      <div className="tab-bar">
        {(['active', 'pending', 'rejected'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`tab-bar__btn ${tab === t ? 'tab-bar__btn--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'active' && 'အလုပ်လုပ်နေသော'}
            {t === 'pending' && 'စစ်ဆ�းနေသော'}
            {t === 'rejected' && 'ငြင်းပယ်ထားသော'}
            <span className="tab-bar__count">
              {machines.filter((m) => m.status === t).length}
            </span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="empty-msg">ဤအမျိုးအစားတွင် စ�်မရှိသေးပ�။</p>
      ) : (
        <div className="machine-list">
          {list.map((m) => {
            const cat = catalog.get(m.level);
            const ratePerSec = cat ? Number(cat.daily_mmk) / 86400 : 0;
            const start = m.start_time ? new Date(m.start_time).getTime() : 0;
            const elapsedSec = start ? Math.max(0, (Date.now() - start) / 1000) : 0;
            const accrued = ratePerSec * elapsedSec;
            return (
              <div key={m.id} className="machine-list__item">
                <div className="machine-list__head">
                  <span className="machine-list__level">{m.level}</span>
                  <span className={`machine-list__status machine-list__status--${m.status}`}>
                    {m.status}
                  </span>
                </div>
                {m.status === 'active' && cat ? (
                  <>
                    <div className="machine-list__row">
                      <span>ဝယ်ယူဈေး</span>
                      <b>{formatMMKShort(Number(m.price_paid_mmk))} MMK</b>
                    </div>
                    <div className="machine-list__row">
                      <span>1 ရက် ဝင်�ွေ</span>
                      <b style={{ color: '#4ade80' }}>+{formatMMKShort(Number(cat.daily_mmk))} MMK</b>
                    </div>
                    <div className="machine-list__row machine-list__row--big">
                      <span>စုစုပေါင်း ဝင်ငွေ</span>
                      <b className="machine-list__accrued">{formatMMK(accrued)} MMK</b>
                    </div>
                    <div className="machine-list__row machine-list__row--small">
                      <span>စတင်ချိန်</span>
                      <span>{formatDate(m.start_time)}</span>
                      <span>· {formatDuration(elapsedSec)}</span>
                    </div>
                  </>
                ) : null}
                {m.status === 'pending' ? (
                  <p className="machine-list__note">Admin စစ်ဆေးန�ပါသည်။ ခဏစောင့်ပါ။</p>
                ) : null}
                {m.status === 'rejected' ? (
                  <p className="machine-list__note machine-list__note--error">
                    ငြင်းပယ်သည်။ အကြောင်းအရင်း — {m.reject_reason ?? '—'}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
