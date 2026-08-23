import { formatMMKShort } from '../lib/format';
import type { Settings } from '../lib/api';

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
  return (
    <div className="payment-instructions">
      <div className="payment-instructions__row">
        <span className="payment-instructions__label">ပမာဏ</span>
        <span className="payment-instructions__amount">{formatMMKShort(amount)} MMK</span>
      </div>
      <div className="payment-instructions__row">
        <span className="payment-instructions__label">ငွေပေးချေမှု</span>
        <span className="payment-instructions__method">
          {method === 'wave' ? 'Wave Money' : 'KBZ Pay'}
        </span>
      </div>
      <div className="payment-instructions__row">
        <span className="payment-instructions__label">ဖုန်းနံပါတ်</span>
        <span className="payment-instructions__phone">{n.phone}</span>
      </div>
      <div className="payment-instructions__row">
        <span className="payment-instructions__label">အမည်</span>
        <span className="payment-instructions__name">{n.name}</span>
      </div>
      <p className="payment-instructions__note">
        အထက်ပါအကောင့်သို့ <b>{formatMMKShort(amount)} MMK</b> လွှဲပြီးပါက အောက်ပါဖော်ပြချက်အတိုင်း ပြန်လည်ဖြည့်သွင်းပေးပါ။
        Admin စစ်ဆေးပြီးမှသာ �က်စတင်အလုပ်လုပ်မည်။
      </p>
    </div>
  );
}
