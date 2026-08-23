import { useLiveBalance } from '../hooks/useLiveBalance';
import { formatMMK, formatMMKShort } from '../lib/format';
import './BalanceTicker.css';

type Props = {
  userId: string | null;
  label?: string;
  showRate?: boolean;
};

/**
 * Server-anchored 1Hz interpolated balance display.
 * Renders the balance, optionally a "rate" subline (per-second income),
 * and ticks every second between server re-syncs.
 */
export function BalanceTicker({ userId, label = 'လက်ကျန်ငွေ', showRate = true }: Props) {
  const { display, ratePerSec } = useLiveBalance(userId);

  if (!userId) {
    return (
      <div className="balance-ticker">
        <div className="balance-ticker__label">{label}</div>
        <div className="balance-ticker__value">— MMK</div>
      </div>
    );
  }

  const dailyEarning = ratePerSec * 86400;

  return (
    <div className="balance-ticker">
      <div className="balance-ticker__label">{label}</div>
      <div className="balance-ticker__value">
        {formatMMKShort(display)} <span className="balance-ticker__unit">MMK</span>
      </div>
      {showRate ? (
        <div className="balance-ticker__rate">
          +{formatMMK(ratePerSec)} MMK/s · +{formatMMKShort(dailyEarning)} MMK/day
        </div>
      ) : null}
    </div>
  );
}
