import { motion } from 'framer-motion';
import { Activity, CalendarDays, Dumbbell, Trophy, TrendingUp } from 'lucide-react';
import { useExerciseAnalytics, useCompletedSessions } from '../hooks/useWorkoutSessions';
import { ProgressBadge } from '../components/ProgressBadge';
import { useReducedMotion } from '../hooks/useReducedMotion';

export function Progress() {
  const analytics = useExerciseAnalytics();
  const sessions = useCompletedSessions();
  const reduced = useReducedMotion();
  const totalVolume = analytics?.reduce((total, item) => total + (item.latest?.totalVolume ?? 0), 0) ?? 0;

  return (
    <main className="progress-page page-container">
      <header className="progress-page-header">
        <div><span className="eyebrow accent-copy">Performance lab</span><h1>Dein Fortschritt.</h1><p>Jede Einheit baut auf der letzten auf.</p></div>
        <div className="progress-header-icon"><TrendingUp size={22} /></div>
      </header>

      <section className="progress-overview-grid" aria-label="Fortschrittsübersicht">
        <OverviewCard icon={<Activity size={16} />} value={sessions?.length ?? 0} label="Sessions" />
        <OverviewCard icon={<Dumbbell size={16} />} value={analytics?.length ?? 0} label="Übungen" />
        <OverviewCard icon={<Trophy size={16} />} value={analytics?.filter((item) => item.latest && item.previous && (item.latest.maxGewicht > item.previous.maxGewicht || item.latest.bestReps > item.previous.bestReps)).length ?? 0} label="Steigerungen" />
        <OverviewCard icon={<TrendingUp size={16} />} value={`${Math.round(totalVolume).toLocaleString('de-DE')}`} label="Volumen kg" />
      </section>

      <section className="progress-section" aria-labelledby="exercise-progress-heading">
        <div className="section-heading"><div><span className="eyebrow">Live analytics</span><h2 id="exercise-progress-heading">Übungs-Progress</h2></div></div>
        {analytics === undefined ? <div className="skeleton-row" /> : analytics.length === 0 ? <div className="progress-empty glass-panel"><Trophy size={24} /><h3>Noch keine Progress-Daten.</h3><p>Beende deine erste Trainingseinheit, damit PRs, 1RM und Overload sichtbar werden.</p></div> : <div className="analytics-list">{analytics.map((item, index) => <AnalyticsCard key={item.exercise.id} item={item} index={index} reduced={reduced} />)}</div>}
      </section>
    </main>
  );
}

function OverviewCard({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return <div className="overview-card glass-panel"><span className="overview-icon">{icon}</span><strong className="overview-value">{value}</strong><span className="overview-label">{label}</span></div>;
}

function AnalyticsCard({ item, index, reduced }: { item: NonNullable<ReturnType<typeof useExerciseAnalytics>>[number]; index: number; reduced: boolean }) {
  const current = item.latest;
  return <motion.article className="analytics-card glass-panel" initial={reduced ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={reduced ? { duration: 0 } : { delay: index * .04 }}>
    <div className="analytics-card-top"><div><span className="eyebrow">{item.exercise.target ?? 'Übung'}</span><h3>{item.exercise.name}</h3></div>{current && <ProgressBadge current={current} previous={item.previous} compact />}</div>
    <div className="analytics-metrics"><Metric label="PR" value={`${item.personalRecord.toLocaleString('de-DE')} kg`} icon={<Trophy size={14} />} /><Metric label="1RM geschätzt" value={`${Math.round(item.bestOneRepMax).toLocaleString('de-DE')} kg`} icon={<TrendingUp size={14} />} /><Metric label="Sessions" value={item.history.length} icon={<CalendarDays size={14} />} /></div>
    {current && <div className="analytics-footer"><ProgressBadge current={current} previous={item.previous} /><span>{current.setCount} Sätze · {Math.round(current.totalVolume).toLocaleString('de-DE')} kg Volumen</span></div>}
  </motion.article>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return <div className="analytics-metric"><span>{icon}</span><strong>{value}</strong><small>{label}</small></div>;
}
