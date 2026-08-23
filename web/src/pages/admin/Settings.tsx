import { useEffect, useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import {
  fetchMachineCatalog,
  updateMachine,
  updateSetting,
  type MachineLevel,
} from '../../lib/api';
import { pushToast } from '../../components/Toast';
import { formatMMKShort } from '../../lib/format';

export function Settings() {
  const { settings, refresh } = useSettings();
  const [machines, setMachines] = useState<MachineLevel[]>([]);
  const [dropEnabled, setDropEnabled] = useState(false);
  const [bonus, setBonus] = useState(5000);
  const [wavePhone, setWavePhone] = useState('');
  const [waveName, setWaveName] = useState('');
  const [kbzPhone, setKbzPhone] = useState('');
  const [kbzName, setKbzName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchMachineCatalog().then(setMachines);
  }, []);

  useEffect(() => {
    if (settings) {
      setDropEnabled(settings.drop_enabled);
      setBonus(settings.refer_bonus_mmk);
      setWavePhone(settings.payment_numbers.wave.phone);
      setWaveName(settings.payment_numbers.wave.name);
      setKbzPhone(settings.payment_numbers.kbz.phone);
      setKbzName(settings.payment_numbers.kbz.name);
    }
  }, [settings]);

  async function saveSettings() {
    setSaving(true);
    try {
      await updateSetting('drop_enabled', dropEnabled);
      await updateSetting('refer_bonus_mmk', bonus);
      await updateSetting('payment_numbers', {
        wave: { phone: wavePhone, name: waveName },
        kbz: { phone: kbzPhone, name: kbzName },
      });
      pushToast('Settings သိမ်းပြီးပါပြီ', 'success');
      refresh();
    } catch (e: any) {
      pushToast(`မအောင်မြင်ပါ: ${e?.message ?? 'unknown'}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function updateMachineField(
    level: string,
    patch: Partial<MachineLevel>
  ) {
    try {
      await updateMachine(level, patch as any);
      pushToast(`${level} updated`, 'success');
      const fresh = await fetchMachineCatalog();
      setMachines(fresh);
    } catch (e: any) {
      pushToast(`မအောင်မြင်ပါ: ${e?.message ?? 'unknown'}`, 'error');
    }
  }

  return (
    <section className="stack">
      <h3 className="home-section__title">⚙️ Settings</h3>

      {/* Drop Toggle */}
      <div className="card">
        <div className="admin-toggle">
          <div>
            <div className="admin-toggle__label">Drop Toggle</div>
            <div className="admin-toggle__sub">
              ငွေထုတ်ယူခြင်း ဖွင့်/ပိတ် (User များသို့ ချက်ချင်း အကျုံးဝင်)
            </div>
          </div>
          <button
            className={`switch ${dropEnabled ? 'switch--on' : ''}`}
            onClick={() => setDropEnabled(!dropEnabled)}
            aria-label="Drop toggle"
          />
        </div>
        <div className="mt-8 text-sm text-dim">
          {dropEnabled ? '✓ ဖွင့်ထားသည် — User များ Drop တင်နိုင်သည်' : '✕ ပိတ်ထားသည် — "Admin ဖွင့်ပေးတာ စောင့်ပါ" ပြမည်'}
        </div>
      </div>

      {/* Refer bonus */}
      <div className="card">
        <div className="card__title">
          <span>🎁 Refer Bonus</span>
          <span className="badge badge--accent">1 Refer</span>
        </div>
        <div className="field">
          <label className="field__label">ဆုကြေး ပမာဏ (MMK)</label>
          <input
            className="input input--mono"
            type="number"
            value={bonus}
            onChange={(e) => setBonus(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Payment numbers */}
      <div className="card">
        <div className="card__title">
          <span>💳 Payment Numbers</span>
          <span className="text-dim text-sm">Wave + KBZ</span>
        </div>
        <div className="stack">
          <div className="card card--flat" style={{ background: 'var(--blue-soft)', borderColor: 'rgba(59, 130, 246, 0.25)' }}>
            <div className="text-sm fw-700 mb-8" style={{ color: 'var(--blue)' }}>🌊 Wave Money</div>
            <div className="field">
              <label className="field__label">ဖုန်းနံပါတ်</label>
              <input className="input input--mono" value={wavePhone} onChange={(e) => setWavePhone(e.target.value)} />
            </div>
            <div className="field mt-12">
              <label className="field__label">အမည်</label>
              <input className="input" value={waveName} onChange={(e) => setWaveName(e.target.value)} />
            </div>
          </div>

          <div className="card card--flat" style={{ background: 'var(--green-soft)', borderColor: 'rgba(34, 197, 94, 0.25)' }}>
            <div className="text-sm fw-700 mb-8" style={{ color: 'var(--green)' }}>💳 KBZ Pay</div>
            <div className="field">
              <label className="field__label">ဖုန်းနံပါတ်</label>
              <input className="input input--mono" value={kbzPhone} onChange={(e) => setKbzPhone(e.target.value)} />
            </div>
            <div className="field mt-12">
              <label className="field__label">အမည်</label>
              <input className="input" value={kbzName} onChange={(e) => setKbzName(e.target.value)} />
            </div>
          </div>
        </div>

        <button
          className="btn btn--primary btn--block mt-16"
          disabled={saving}
          onClick={saveSettings}
        >
          {saving ? 'သိမ်းနေသည်...' : '💾 Settings သိမ်းမည်'}
        </button>
      </div>

      {/* Machine catalog */}
      <div className="card">
        <div className="card__title">
          <span>⛏️ Machine Catalog</span>
          <span className="text-dim text-sm">{machines.length} စက်</span>
        </div>
        <div className="stack">
          {machines.map((m) => (
            <MachineEditor
              key={m.level}
              machine={m}
              onSave={(patch) => updateMachineField(m.level, patch)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function MachineEditor({
  machine,
  onSave,
}: {
  machine: MachineLevel;
  onSave: (patch: { price_mmk?: number; daily_mmk?: number; active?: boolean; name?: string }) => void;
}) {
  const [price, setPrice] = useState(Number(machine.price_mmk));
  const [daily, setDaily] = useState(Number(machine.daily_mmk));
  const [active, setActive] = useState(true);
  const dirty =
    price !== Number(machine.price_mmk) ||
    daily !== Number(machine.daily_mmk);
  const ratePerSec = daily / 86400;

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 'var(--radius)',
        background: 'var(--bg-1)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="row row--between mb-8">
        <div className="row gap-8">
          <span className="text-accent fw-800" style={{ fontSize: 18 }}>{machine.level}</span>
          <span className="text-dim text-sm">{formatMMKShort(ratePerSec)} MMK/s</span>
        </div>
        <label className="row gap-8" style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            style={{ accentColor: 'var(--accent)' }}
          />
          active
        </label>
      </div>
      <div className="stack stack--sm">
        <div className="field">
          <label className="field__label">Price (MMK)</label>
          <input
            className="input input--mono"
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label className="field__label">Daily (MMK)</label>
          <input
            className="input input--mono"
            type="number"
            value={daily}
            onChange={(e) => setDaily(Number(e.target.value))}
          />
        </div>
      </div>
      <button
        className="btn btn--primary btn--block mt-12"
        disabled={!dirty}
        onClick={() => onSave({ price_mmk: price, daily_mmk: daily, active })}
      >
        Update {machine.level}
      </button>
    </div>
  );
}