import { useEffect, useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import {
  fetchMachineCatalog,
  updateMachine,
  updateSetting,
  type MachineLevel,
} from '../../lib/api';
import { pushToast } from '../../components/Toast';

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

  async function updateMachineField(level: string, patch: Partial<MachineLevel>) {
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
    <div className="admin-page">
      <h2 className="page-title">Settings</h2>

      <div className="settings-card">
        <h3>Drop Toggle</h3>
        <label className="switch-row">
          <span>Drop (ငွေ�ုတ်ယူခြင်း) �ွင့်/ပိတ်</span>
          <button
            className={`switch ${dropEnabled ? 'switch--on' : ''}`}
            onClick={() => setDropEnabled(!dropEnabled)}
          >
            {dropEnabled ? 'ဖွင့်ထားသည်' : 'ပိတ်ထားသ�်'}
          </button>
        </label>
      </div>

      <div className="settings-card">
        <h3>Refer Bonus</h3>
        <label className="form-label">1 Refer ဆုကြေး (MMK)</label>
        <input
          className="form-input"
          type="number"
          value={bonus}
          onChange={(e) => setBonus(Number(e.target.value))}
        />
      </div>

      <div className="settings-card">
        <h3>Payment Numbers</h3>
        <div className="grid-2">
          <div>
            <label className="form-label">Wave Phone</label>
            <input className="form-input" value={wavePhone} onChange={(e) => setWavePhone(e.target.value)} />
            <label className="form-label">Wave Name</label>
            <input className="form-input" value={waveName} onChange={(e) => setWaveName(e.target.value)} />
          </div>
          <div>
            <label className="form-label">KBZ Phone</label>
            <input className="form-input" value={kbzPhone} onChange={(e) => setKbzPhone(e.target.value)} />
            <label className="form-label">KBZ Name</label>
            <input className="form-input" value={kbzName} onChange={(e) => setKbzName(e.target.value)} />
          </div>
        </div>
        <button className="cta-btn" disabled={saving} onClick={saveSettings}>
          {saving ? 'သိမ်းနေ�ည်...' : 'Settings သိမ်းမည်'}
        </button>
      </div>

      <div className="settings-card">
        <h3>Machine Catalog</h3>
        {machines.map((m) => (
          <MachineEditor
            key={m.level}
            machine={m}
            onSave={(patch) => updateMachineField(m.level, patch)}
          />
        ))}
      </div>
    </div>
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
    price !== Number(machine.price_mmk) || daily !== Number(machine.daily_mmk);
  return (
    <div className="machine-editor">
      <div className="machine-editor__head">
        <b>{machine.level}</b>
        <label>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          {' '}active
        </label>
      </div>
      <div className="grid-2">
        <div>
          <label className="form-label">Price (MMK)</label>
          <input className="form-input" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        </div>
        <div>
          <label className="form-label">Daily MMK</label>
          <input className="form-input" type="number" value={daily} onChange={(e) => setDaily(Number(e.target.value))} />
        </div>
      </div>
      <button
        className="cta-btn cta-btn--small"
        disabled={!dirty}
        onClick={() => onSave({ price_mmk: price, daily_mmk: daily, active })}
      >Update</button>
    </div>
  );
}
