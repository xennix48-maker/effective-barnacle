import { formatMMKShort } from '../lib/format';
import type { Settings } from '../lib/api';
import { pushToast } from './Toast';

export function PaymentInstructions({
  amount,
  numbers,
  method,
}: {
  amount: number;
  numbers: Settings['payment_numbers'];
  method: 'wave' | 'kbz';
}) {
  const n = numbers[method];

  function copy(value: string, label: string) {
    navigator.clipboard.writeText(value).then(
      () => pushToast(`${label} ကူးပြီးပါပြီ`, 'success'),
      () => pushToast('ကူး၍ မရပါ', 'error')
    );
  }

  return (
    <section className="payment-instructions">
      <header className="payment-instructions__head">
        <span className="payment-instructions__title">
          {method === 'wave' ? '🌊 Wave Money' : '💳 KBZ Pay'}
        </span>
        <span className="badge badge--accent">
          {formatMMKShort(amount)} MMK
        </span>
      </header>

      <div className="payment-instructions__list">
        <button
          type="button"
          className="payment-instructions__row"
          onClick={() => copy(n.phone, 'ဖုန်းနံပါတ်')}
        >
          <span className="payment-instructions__label">ဖုန်းနံပါတ်</span>
          <span className="payment-instructions__value payment-instructions__value--mono">
            {n.phone}
          </span>
          <span className="payment-instructions__copy">📋</span>
        </button>
        <button
          type="button"
          className="payment-instructions__row"
          onClick={() => copy(n.name, 'အမည်')}
        >
          <span className="payment-instructions__label">အမည်</span>
          <span className="payment-instructions__value">{n.name}</span>
          <span className="payment-instructions__copy">📋</span>
        </button>
      </div>

      <div className="payment-instructions__note">
        ℹ️ အထက်ပါအကောင့်သို့ <b>{formatMMKShort(amount)} MMK</b> လွှဲပြီးပါက
        အောက်ပါဖော်ပြချက်အတိုင်း ပြန်လည်ဖြည့်သွင်းပေးပါ။
        Admin စစ်ဆေးပြီးမှသာ စက်စတင်အလုပ်လုပ်မည်။
      </div>
    </section>
  );
}