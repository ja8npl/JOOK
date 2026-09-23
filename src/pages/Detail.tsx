import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { lazy, Suspense, useState } from 'react';
import {
  ChevronLeft, Plus, Pencil, Trash2,
  Target, AlertCircle, Settings, Dumbbell,
} from 'lucide-react';
import { useEntriesForMachine } from '../hooks/useEntries';
import { deleteEntry } from '../hooks/useEntries';
import { bestSetOf, setsOf } from '../hooks/useSets';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { type GymEntry } from '../db/schema';

/* recharts + d3 (≈35 % des Bundles) nur laden, wenn der Chart wirklich gerendert wird. */
const ProgressionChart = lazy(() => import('../components/ProgressionChart').then((m) => ({ default: m.ProgressionChart })));

export function Detail() {
  const { machineId } = useParams<{ machineId: string }>();
  const navigate      = useNavigate();
  const reduced       = useReducedMotion();
  const entries       = useEntriesForMachine(decodeURIComponent(machineId ?? ''));
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const handleDelete = async () => {
    if (deleteTargetId !== null) {
      await deleteEntry(deleteTargetId);
      setDeleteTargetId(null);
      if (entries && entries.length <= 1) navigate('/', { replace: true });
    }
  };

  const machineName = entries?.[0]?.name ?? decodeURIComponent(machineId ?? '');

  return (
    <div className="page-container">
      {/* Back */}
      <div style={{ marginBottom: '22px' }}>
        <motion.button
          onClick={() => navigate(-1)}
          whileTap={reduced ? undefined : { scale: 0.96 }}
          aria-label="Zurück"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            color: 'var(--accent-text)',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '8px 0',
            minHeight: '44px',
          }}
        >
          <ChevronLeft size={20} strokeWidth={2} />
          Übersicht
        </motion.button>
      </div>

      {/* Header */}
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '34px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: 'var(--tracking-display)',
            lineHeight: 1.1,
          }}>
            {machineName}
          </h1>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-tertiary)',
            marginTop: '4px',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {entries?.length ?? 0} {entries?.length === 1 ? 'Eintrag' : 'Einträge'}
          </p>
        </div>

        {/* Add-Button — konvex */}
        <motion.button
          onClick={() => navigate(`/new?name=${encodeURIComponent(machineName)}`)}
          whileTap={reduced ? undefined : { scale: 0.96 }}
          aria-label="Neuer Eintrag für diese Maschine"
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'var(--accent-dim)',
            boxShadow: 'var(--neo-raised)',
            border: '1px solid var(--border-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Plus size={22} color="var(--accent-text)" strokeWidth={2} />
        </motion.button>
      </header>

      {/* Chart */}
      {entries !== undefined && entries.length > 0 && (
        <Suspense fallback={<div className="skeleton-row" style={{ height: 260, borderRadius: 20 }} />}>
          <ProgressionChart entries={entries} reduced={reduced} />
        </Suspense>
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

function EntryCard({ entry, index, isLatest, onEdit, onDelete, reduced }: {
  entry: GymEntry;
  index: number;
  isLatest: boolean;
  onEdit: () => void;
  onDelete: () => void;
  reduced: boolean;
}) {
  const dateStr = new Date(entry.datum).toLocaleDateString('de-DE', {
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
      className="neo-card"
      style={{
        padding: '18px',
        border: `1px solid ${isLatest ? 'var(--border-accent)' : 'var(--border)'}`,
        boxShadow: isLatest ? 'var(--shadow-accent)' : 'var(--neo-raised)',
        position: 'relative',
      }}
    >
      {/* Aktuell-Badge */}
      {isLatest && (
        <div style={{
          position: 'absolute',
          top: '14px',
          right: '14px',
          background: 'var(--accent)',
          color: 'var(--text-on-accent)',
          fontSize: '9px',
          fontWeight: 800,
          padding: '3px 8px',
          borderRadius: '6px',
          letterSpacing: '0.08em',
          boxShadow: 'var(--neo-knob)',
          animation: 'badge-pop 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
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
        <EntryField
          icon={<Settings size={13} color="var(--accent-text)" />}
          label="Einstellung"
          value={entry.einstellung}
        />
        {entry.problem && (
          <EntryField
            icon={<AlertCircle size={13} color="var(--warning)" />}
            label="Problem / Notiz"
            value={entry.problem}
          />
        )}
        {entry.ziel && (
          <EntryField
            icon={<Target size={13} color="var(--info)" />}
            label="Ziel"
            value={entry.ziel}
          />
        )}
        {setsOf(entry).length > 0 && <SetsSummary entry={entry} />}
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginTop: '16px',
        paddingTop: '14px',
        borderTop: '1px solid var(--border)',
      }}>
        <motion.button
          onClick={onEdit}
          whileTap={reduced ? undefined : { scale: 0.96 }}
          aria-label="Eintrag bearbeiten"
          style={{
            flex: 1,
            padding: '11px',
            background: 'var(--bg-input)',
            boxShadow: 'var(--neo-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            minHeight: '44px',
            transition: 'box-shadow var(--duration-press) var(--ease-press)',
          }}
        >
          <Pencil size={14} strokeWidth={2} />
          Bearbeiten
        </motion.button>
        <motion.button
          onClick={onDelete}
          whileTap={reduced ? undefined : { scale: 0.96 }}
          aria-label="Eintrag löschen"
          style={{
            width: '48px',
            padding: '11px',
            background: 'var(--danger-dim)',
            boxShadow: 'var(--neo-pressed)',
            border: '1px solid var(--danger-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--danger)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '44px',
            transition: 'box-shadow var(--duration-press) var(--ease-press)',
          }}
        >
          <Trash2 size={16} strokeWidth={2} />
        </motion.button>
      </div>
    </motion.div>
  );
}

function EntryField({ icon, label, value }: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
        {icon}
        <span style={{
          fontSize: '10px',
          color: 'var(--text-tertiary)',
          fontWeight: 700,
          letterSpacing: '0.06em',
        }}>
          {label.toUpperCase()}
        </span>
      </div>
      <p style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
        {value}
      </p>
    </div>
  );
}

function SetsSummary({ entry }: { entry: GymEntry }) {
  const sets   = setsOf(entry);
  const best   = bestSetOf(entry);
  const gewichte = sets.map((s) => s.gewicht);
  const minG   = Math.min(...gewichte);
  const maxG   = Math.max(...gewichte);
  const range  = minG === maxG
    ? `${minG.toLocaleString('de-DE')} kg`
    : `${minG.toLocaleString('de-DE')}–${maxG.toLocaleString('de-DE')} kg`;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
        <Dumbbell size={13} color="var(--accent-text)" />
        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.06em' }}>
          SÄTZE
        </span>
      </div>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        padding: '12px',
        background: 'var(--accent-dim)',
        boxShadow: 'var(--neo-pressed)',
        border: '1px solid var(--border-accent)',
        borderRadius: 'var(--radius-sm)',
      }}>
        {sets.map((s, i) => (
          <span
            key={s.timestamp + '-' + i}
            style={{
              fontSize: '13px',
              fontWeight: 700,
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
      <p style={{
        fontSize: '12px',
        color: 'var(--text-tertiary)',
        marginTop: '6px',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {sets.length} Sätze, {range}
        {best && ` (Best ${best.gewicht.toLocaleString('de-DE')} kg × ${best.wiederholungen})`}
      </p>
    </div>
  );
}
