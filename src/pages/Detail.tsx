import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { ChevronLeft, Plus, Pencil, Trash2, Target, AlertCircle, Settings, Dumbbell } from 'lucide-react';
import { useEntriesForMachine } from '../hooks/useEntries';
import { deleteEntry } from '../hooks/useEntries';
import { bestSetOf, setsOf } from '../hooks/useSets';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { ProgressionChart } from '../components/ProgressionChart';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { type GymEntry } from '../db/schema';

export function Detail() {
  const { machineId } = useParams<{ machineId: string }>();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const entries = useEntriesForMachine(decodeURIComponent(machineId ?? ''));

  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const handleDelete = async () => {
    if (deleteTargetId !== null) {
      await deleteEntry(deleteTargetId);
      setDeleteTargetId(null);
      // Wenn letzter Eintrag gelöscht → zurück zur Übersicht
      if (entries && entries.length <= 1) {
        navigate('/', { replace: true });
      }
    }
  };

  const machineName = entries?.[0]?.name ?? decodeURIComponent(machineId ?? '');

  return (
    <div className="page-container">
      {/* Back Navigation */}
      <div style={{ marginBottom: '24px' }}>
        <motion.button
          onClick={() => navigate(-1)}
          whileTap={reduced ? undefined : { scale: 0.95 }}
          aria-label="Zurück"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            fontSize: '16px',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '8px 0',
            minHeight: '44px',
          }}
        >
          <ChevronLeft size={20} />
          Übersicht
        </motion.button>
      </div>

      {/* Header */}
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '32px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            lineHeight: 1.1,
          }}>
            {machineName}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            {entries?.length ?? '—'} {entries?.length === 1 ? 'Eintrag' : 'Einträge'}
          </p>
        </div>

        {/* Neuen Eintrag für diese Maschine */}
        <motion.button
          onClick={() => navigate(`/new?name=${encodeURIComponent(machineName)}`)}
          whileTap={reduced ? undefined : { scale: 0.92 }}
          aria-label="Neuer Eintrag für diese Maschine"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '14px',
            background: 'var(--accent-dim)',
            border: '1px solid var(--border-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Plus size={20} color="var(--accent)" />
        </motion.button>
      </header>

      {/* Progressions-Analyse */}
      {entries !== undefined && entries.length > 0 && (
        <ProgressionChart entries={entries} reduced={reduced} />
      )}

      {/* Eintrags-Verlauf */}
      {entries === undefined ? (
        <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', paddingTop: '40px' }}>
          Lade…
        </div>
      ) : entries.length === 0 ? (
        <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', paddingTop: '40px' }}>
          Keine Einträge gefunden.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {entries.map((entry, index) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              index={index}
              isLatest={index === 0}
              onEdit={() => navigate(`/edit/${entry.id}`)}
              onDelete={() => setDeleteTargetId(entry.id!)}
              reduced={reduced}
            />
          ))}
        </div>
      )}

      {/* Löschen-Bestätigung */}
      <ConfirmSheet
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title="Eintrag löschen?"
        message="Dieser Eintrag wird dauerhaft gelöscht und kann nicht wiederhergestellt werden."
        confirmLabel="Löschen"
      />
    </div>
  );
}

function EntryCard({
  entry,
  index,
  isLatest,
  onEdit,
  onDelete,
  reduced,
}: {
  entry: GymEntry;
  index: number;
  isLatest: boolean;
  onEdit: () => void;
  onDelete: () => void;
  reduced: boolean;
}) {
  const date = new Date(entry.datum);
  const dateStr = date.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced
        ? { duration: 0 }
        : { type: 'spring', stiffness: 300, damping: 26, delay: index * 0.04 }
      }
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${isLatest ? 'var(--border-accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-card)',
        padding: '18px',
        boxShadow: isLatest ? 'var(--shadow-accent)' : 'var(--shadow-card)',
        position: 'relative',
      }}
    >
      {/* Latest Badge */}
      {isLatest && (
        <div style={{
          position: 'absolute',
          top: '14px',
          right: '14px',
          background: 'var(--accent)',
          color: 'var(--bg-base)',
          fontSize: '10px',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: '6px',
          letterSpacing: '0.05em',
        }}>
          AKTUELL
        </div>
      )}

      {/* Datum */}
      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '14px' }}>
        {dateStr}
      </div>

      {/* Felder */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <EntryField icon={<Settings size={14} color="var(--accent)" />} label="Einstellung" value={entry.einstellung} />
        {entry.problem && <EntryField icon={<AlertCircle size={14} color="var(--warning)" />} label="Problem / Notiz" value={entry.problem} />}
        {entry.ziel && <EntryField icon={<Target size={14} color="var(--info)" />} label="Ziel" value={entry.ziel} />}
        {setsOf(entry).length > 0 && <SetsSummary entry={entry} />}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
        <motion.button
          onClick={onEdit}
          whileTap={reduced ? undefined : { scale: 0.95 }}
          aria-label="Eintrag bearbeiten"
          style={{
            flex: 1,
            padding: '10px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            minHeight: '44px',
          }}
        >
          <Pencil size={14} />
          Bearbeiten
        </motion.button>
        <motion.button
          onClick={onDelete}
          whileTap={reduced ? undefined : { scale: 0.95 }}
          aria-label="Eintrag löschen"
          style={{
            width: '44px',
            padding: '10px',
            background: 'var(--danger-dim)',
            border: '1px solid var(--danger-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--danger)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '44px',
          }}
        >
          <Trash2 size={16} />
        </motion.button>
      </div>
    </motion.div>
  );
}

function EntryField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
        {icon}
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.04em' }}>
          {label.toUpperCase()}
        </span>
      </div>
      <p style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
        {value}
      </p>
    </div>
  );
}

/** Sets-Zusammenfassung in der EntryCard */
function SetsSummary({ entry }: { entry: GymEntry }) {
  const sets = setsOf(entry);
  const best = bestSetOf(entry);
  const gewichte = sets.map((s) => s.gewicht);
  const minG = Math.min(...gewichte);
  const maxG = Math.max(...gewichte);
  const range = minG === maxG
    ? `${minG.toLocaleString('de-DE')} kg`
    : `${minG.toLocaleString('de-DE')}–${maxG.toLocaleString('de-DE')} kg`;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
        <Dumbbell size={14} color="var(--accent)" />
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.04em' }}>
          SÄTZE
        </span>
      </div>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        padding: '10px',
        background: 'var(--accent-dim)',
        border: '1px solid var(--border-accent)',
        borderRadius: 'var(--radius-sm)',
      }}>
        {sets.map((s, i) => (
          <span
            key={s.timestamp + '-' + i}
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              background: 'var(--bg-chip-inset)',
              padding: '4px 10px',
              borderRadius: '8px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {i + 1} · {s.gewicht.toLocaleString('de-DE')} × {s.wiederholungen}
          </span>
        ))}
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
        {sets.length} Sätze · {range}
        {best && ` · Best ${best.gewicht.toLocaleString('de-DE')} kg × ${best.wiederholungen}`}
      </p>
    </div>
  );
}
