import { Link } from 'react-router-dom';
import { formatMMK, formatMMKShort } from '../lib/format';
import type { MachineLevel } from '../lib/api';
import './MachineCard.css';

const LEVEL_META: Record<string, { icon: string; tag: string; tone: string }> = {
  L1:    { icon: '⛏️', tag: 'အစပြု',         tone: 'green' },
  L2:    { icon: '⚡', tag: 'အလယ်အလတ်',    tone: 'blue' },
  L3:    { icon: '💎', tag: 'အဆင့်မြင့်',    tone: 'accent' },
  L5:    { icon: '🚀', tag: 'ပရော်ဖက်ရှင်', tone: 'amber' },
  Super: { icon: '👑', tag: 'အကောင်းဆုံး',   tone: 'accent' },
};

export function MachineCard({ machine }: { machine: MachineLevel }) {
  const meta = LEVEL_META[machine.level] ?? LEVEL_META.L1;
  const dailyReturnPct = ((machine.daily_mmk / machine.price_mmk) * 100).toFixed(2);
  const paybackDays = (machine.price_mmk / machine.daily_mmk).toFixed(1);

  return (
    <Link to={`/buy/${machine.level}`} className={`machine-card machine-card--${meta.tone}`}>
      <div className="machine-card__top">
        <div className="machine-card__icon" aria-hidden>{meta.icon}</div>
        <span className="badge badge--accent">{meta.tag}</span>
      </div>
      <div className="machine-card__name">{machine.name}</div>
      <div className="machine-card__level">{machine.level}</div>

      <div className="machine-card__stat">
        <div className="machine-card__stat-label">စျေးနှုန်း</div>
        <div className="machine-card__stat-value">{formatMMKShort(machine.price_mmk)} <span className="text-sm text-dim">MMK</span></div>
      </div>

      <div className="machine-card__divider" />

      <div className="machine-card__stat">
        <div className="machine-card__stat-label">နေ့စဉ်ဝင်ငွေ</div>
        <div className="machine-card__stat-value text-green">
          +{formatMMKShort(machine.daily_mmk)} <span className="text-sm text-dim">MMK/ရက်</span>
        </div>
      </div>

      <div className="machine-card__rate">
        <span className="machine-card__rate-pill">
          ⚡ {formatMMK(machine.rate_per_sec)} MMK/s
        </span>
      </div>

      <div className="machine-card__meta">
        <div className="machine-card__meta-item">
          <span className="text-mute">ပြန်ဆပ်ရက်</span>
          <span className="fw-700">{paybackDays} ရက်</span>
        </div>
        <div className="machine-card__meta-item">
          <span className="text-mute">နေ့စဉ်ရာခိုင်နှုန်း</span>
          <span className="fw-700 text-accent">{dailyReturnPct}%</span>
        </div>
      </div>

      <div className="machine-card__cta">ဝယ်ယူမည် →</div>
    </Link>
  );
}