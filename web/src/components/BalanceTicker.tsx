import { useLiveBalance } from '../hooks/useLiveBalance';
import { formatMMK, formatMMKShort } from '../lib/format';
import './BalanceTicker.css';

type Props = {
  userId: string | null;
  label?: string;
  showRate?: boolean;
};

/**
 * Premium live balance card with pulse indicator and per-second / per-day
 * rate pills. Server-anchored — interpolates 1Hz between 30s re-syncs.
 */
export function BalanceTicker({ userId, label = 'လက်ကျန်ငွေ', showRate = true }: Props) {
  const { display, ratePerSec } = useLiveBalance(userId);
  const muted = !userId;

  const dailyEarning = ratePerSec * 86400;

  return (
    <div className={`balance-ticker${muted ? ' balance-ticker--muted' : ''}`}>
      <div className="balance-ticker__head">
        <span className="balance-ticker__label">{label}</span>
        {!muted ? (
          <span className="balance-ticker__pulse">Live</span>
        ) : null}
      </div>
      <div className="balance-ticker__value">
        {muted ? '—' : formatMMKShort(display)}
        <span className="balance-ticker__unit">MMK</span>
      </div>
      {showRate && !muted && ratePerSec > 0 ? (
        <div className="balance-ticker__rate">
          <span className="balance-ticker__pill">
            +{formatMMK(ratePerSec)} MMK/s
          </span>
          <span className="balance-ticker__pill balance-ticker__pill--green">
            +{formatMMKShort(dailyEarning)} MMK/day
          </span>
        </div>
      ) : null}
    </div>
  );
}