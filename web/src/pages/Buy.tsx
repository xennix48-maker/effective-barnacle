import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { PaymentInstructions } from '../components/PaymentInstructions';
import {
  fetchMachineCatalog,
  submitPurchaseRequest,
  type MachineLevel,
} from '../lib/api';
import { pushToast } from '../components/Toast';
import { formatMMKShort } from '../lib/format';

export function Buy() {
  const { level } = useParams<{ level: string }>();
  const navigate = useNavigate();
  const { user, telegramId } = useAuth();
  const { settings } = useSettings();
  const [machine, setMachine] = useState<MachineLevel | null>(null);
  const [method, setMethod] = useState<'wave' | 'kbz'>('wave');
  const [phone, setPhone] = useState('');
  const [last6, setLast6] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchMachineCatalog().then((all) => {
      const m = all.find((x) => x.level === level);
      setMachine(m ?? null);
    });
  }, [level]);

  if (!machine) {
    return (
      <div className="page">
        <p>စ�်မတွေ့ပါ။</p>
        <button onClick={() => navigate('/')}>ပြန်သွားမည်</button>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!/^\d{6}$/.test(last6)) {
      pushToast('နောက်ဆုံး � လုံးကို မှန်ကန်စွာ ထည့်ပါ', 'error');
      return;
    }
    if (!phone.trim()) {
      pushToast('ဖုန်းနံပါတ် ထည့်ပါ', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await submitPurchaseRequest({
        userId: user.id,
        level: machine!.level,
        priceMmk: Number(machine!.price_mmk),
        paymentMethod: method,
        phone: phone.trim(),
        accountName: user.user_metadata?.first_name ?? '',
        last6: last6.trim(),
        note: note.trim(),
      });
      pushToast('ဝယ်ယူမှုတင်ပြီးပ�ပြီ။ Admin စစ်ဆေ�ပြီးမှ စက်�တင်အလုပ်လုပ်မည်။', 'success');
      navigate('/machines');
    } catch (e: any) {
      pushToast(`မအောင်မြင်ပါ: ${e?.message ?? 'unknown'}`, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate(-1)}>← ပြန်သွားမည်</button>
      <h1 className="page-title">{machine.name}</h1>
      <p className="page-subtitle">{formatMMKShort(machine.price_mmk)} MMK · +{formatMMKShort(machine.daily_mmk)} MMK/day</p>

      {settings ? (
        <PaymentInstructions amount={Number(machine.price_mmk)} numbers={settings.payment_numbers} method={method} />
      ) : null}

      <form className="buy-form" onSubmit={onSubmit}>
        <label className="form-label">ငွေပေးချေမှုနည်းလမ်း</label>
        <div className="method-toggle">
          <button
            type="button"
            className={`method-toggle__btn ${method === 'wave' ? 'method-toggle__btn--active' : ''}`}
            onClick={() => setMethod('wave')}
          >Wave Money</button>
          <button
            type="button"
            className={`method-toggle__btn ${method === 'kbz' ? 'method-toggle__btn--active' : ''}`}
            onClick={() => setMethod('kbz')}
          >KBZ Pay</button>
        </div>

        <label className="form-label">သင့်ဖုန်းနံပါတ်</label>
        <input
          className="form-input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="09xxxxxxxxx"
          inputMode="tel"
        />

        <label className="form-label">လွှဲငွေ Transaction နောက်ဆုံး ၆ လုံး</label>
        <input
          className="form-input"
          value={last6}
          onChange={(e) => setLast6(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456"
          inputMode="numeric"
        />

        <label className="form-label">မှတ်ချက် (ရည်ညွှန်း�မှတ်/ပုံ URL ရွေးချယ်၍ဖြစ်ဖြစ်)</label>
        <textarea
          className="form-input form-input--textarea"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Screenshot link, account name, etc."
          rows={2}
        />

        <button className="cta-btn" type="submit" disabled={submitting || !telegramId}>
          {submitting ? 'တင်နေသည်...' : 'ဝယ်ယူ�ှုတင်ပြမည�'}
        </button>
      </form>
    </div>
  );
}
