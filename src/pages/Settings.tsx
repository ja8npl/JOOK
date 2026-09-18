import { useRef, useState } from 'react';
import { Download, FileJson, Settings as SettingsIcon, Upload } from 'lucide-react';
import { exportWorkoutData, importWorkoutData } from '../hooks/useWorkoutSessions';

export function Settings() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      const data = await exportWorkoutData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gym-log-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage('Backup exportiert.');
    } catch {
      setMessage('Export konnte nicht erstellt werden.');
    } finally { setBusy(false); }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await importWorkoutData(await file.text());
      setMessage('Backup wiederhergestellt.');
    } catch {
      setMessage('Backup ist ungültig oder konnte nicht gelesen werden.');
    } finally { setBusy(false); event.target.value = ''; }
  };

  return <main className="settings-page page-container"><header className="progress-page-header"><div><span className="eyebrow accent-copy">Data center</span><h1>Deine Daten.</h1><p>Exportiere und sichere deinen Trainingsverlauf.</p></div><div className="progress-header-icon"><SettingsIcon size={22} /></div></header><section className="backup-panel glass-panel"><div className="backup-icon"><FileJson size={23} /></div><div><h2>Backup & Restore</h2><p>Ein JSON-Backup enthält Einträge, Sessions und deine Progress-Historie.</p></div><div className="backup-actions"><button className="primary-button" type="button" onClick={handleExport} disabled={busy}><Download size={16} /> JSON exportieren</button><button className="secondary-button" type="button" onClick={() => inputRef.current?.click()} disabled={busy}><Upload size={16} /> Backup importieren</button><input ref={inputRef} type="file" accept="application/json,.json" onChange={handleImport} hidden /></div>{message && <p className="backup-message" role="status">{message}</p>}</section></main>;
}
