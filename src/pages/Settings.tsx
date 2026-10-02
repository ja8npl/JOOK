import { useRef, useState } from 'react';
import { Download, FileJson, Settings as SettingsIcon, Upload } from 'lucide-react';
import { exportWorkoutData, importWorkoutData } from '../hooks/useWorkoutSessions';
import { backupFilename, downloadJson } from '../lib/download';

export function Settings() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      const data = await exportWorkoutData();
      downloadJson(backupFilename(), data);
      setMessage('Backup exportiert.');
    } catch {
      setMessage('Export konnte nicht erstellt werden.');
    } finally { setBusy(false); }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const confirmed = window.confirm(
      'Beim Import werden alle im Backup enthaltenen Daten ersetzt: Einträge, Sessions, Fortschritt, Warm-ups, Gewicht, Einstellungen und – bei v3-Backups – Vorlagen, aktive Einheit und App-Präferenzen.\n\n' +
        'Vorher wird automatisch eine Sicherung des aktuellen Stands gespeichert.\n\n„' +
        file.name +
        '“ jetzt wiederherstellen?',
    );
    if (!confirmed) { event.target.value = ''; return; }
    setBusy(true);
    try {
      // Notfall-Kopie des aktuellen Stands, bevor der Import alles ersetzt.
      try { downloadJson(backupFilename('gym-log-sicherung-vor-import'), await exportWorkoutData()); } catch { /* Sicherung ist optional */ }
      const counts = await importWorkoutData(await file.text());
      setMessage(`Backup wiederhergestellt: ${counts.entries} Einträge, ${counts.sessions} Sessions, ${counts.progressHistory} Progress-Punkte.`);
      if (counts.localDataRestored) window.setTimeout(() => window.location.reload(), 1_000);
    } catch {
      setMessage('Backup ist ungültig oder konnte nicht gelesen werden. Es wurde nichts geändert.');
    } finally { setBusy(false); event.target.value = ''; }
  };

  return <main className="settings-page page-container"><header className="progress-page-header"><div><span className="eyebrow accent-copy">Data center</span><h1>Deine Daten.</h1><p>Exportiere und sichere deinen Trainingsverlauf.</p></div><div className="progress-header-icon"><SettingsIcon size={22} /></div></header><section className="backup-panel glass-panel"><div className="backup-icon"><FileJson size={23} /></div><div><h2>Backup & Restore</h2><p>Das JSON-Backup enthält Einträge, Sessions, Fortschritt, Warm-up-Konfigurationen, Körpergewicht, Einstellungen, eigene Trainingsvorlagen, eine aktive Einheit sowie Theme und Timer-Präferenzen.</p></div><div className="backup-actions"><button className="primary-button" type="button" onClick={handleExport} disabled={busy}><Download size={16} /> JSON exportieren</button><button className="secondary-button" type="button" onClick={() => inputRef.current?.click()} disabled={busy}><Upload size={16} /> Backup importieren</button><input ref={inputRef} type="file" accept="application/json,.json" onChange={handleImport} hidden /></div>{message && <p className="backup-message" role="status">{message}</p>}</section></main>;
}
