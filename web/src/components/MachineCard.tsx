import { Link } from 'react-router-dom';
import { formatMMK, formatMMKShort } from '../lib/format';
import type { MachineLevel } from '../lib/api';
import './MachineCard.css';

export function MachineCard({ machine }: { machine: MachineLevel }) {
  return (
    <Link to={`/buy/${machine.level}`} className="machine-card">
      <div className="machine-card__head">
        <div className="machine-card__level">{machine.level}</div>
        <div className="machine-card__name">{machine.name}</div>
      </div>
      <div className="machine-card__row">
        <span className="machine-card__label">စျေးနှုန်း</span>
        <span className="machine-card__price">{formatMMKShort(machine.price_mmk)} MMK</span>
      </div>
      <div className="machine-card__row">
        <span className="machine-card__label">� ရက်ဝင်ငွေ</span>
        <span className="machine-card__earn">+{formatMMKShort(machine.daily_mmk)} MMK</span>
      </div>
      <div className="machine-card__row machine-card__row--small">
        <span className="machine-card__label">တစ်စက္ကန့်ဝင်ငွေ</span>
        <span className="machine-card__rate">{formatMMK(machine.rate_per_sec)} MMK/s</span>
      </div>
      <div className="machine-card__cta">ဝယ်ယူမည် →</div>
    </Link>
  );
}
