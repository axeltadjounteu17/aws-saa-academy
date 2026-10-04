import { useRef, useState } from 'react';
import { Award, Download, Flame, RotateCcw, Upload } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { parseImportedStorage, readStorage, resetStorage, restoreStorageBackup, saveStorage } from '../utils/storage/store';
import { dueRevisionItems, xpForNextLevel } from '../utils/progress/learning';
import { PageHeader, ProgressBar, Select, StatCard } from '../components/app/ui';
import { CONTENT_TOTALS } from '../types';

const BADGE_TEXT = {
  'first-course': ['Premier cours', 'First course', 'Terminer un premier cours', 'Finish a first course'],
  'week-streak': ['Régularité', 'Consistency', 'Étudier 7 jours consécutifs', 'Study 7 days in a row'],
  'official-pass': ['Prêt pour AWS', 'AWS ready', 'Réussir un examen officiel', 'Pass an official exam'],
  'all-courses': ['Architecte assidu', 'Dedicated architect', `Terminer les ${CONTENT_TOTALS.courses} cours`, `Finish all ${CONTENT_TOTALS.courses} courses`],
  'all-labs': ['Maître des labs', 'Lab master', `Terminer les ${CONTENT_TOTALS.labs} labs`, `Finish all ${CONTENT_TOTALS.labs} labs`],
};

export default function ProfileView() {
  const { storage, stats, badges, examHistory, revisionQueue, language, theme, setLanguage, setTheme, updateStorage, tr } = useAppContext();
  const fileRef = useRef(null);
  const [message, setMessage] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const accuracy = stats.questionsAnswered ? Math.round((stats.correctAnswers / stats.questionsAnswered) * 100) : 0;
  const due = dueRevisionItems(revisionQueue).length;

  const exportProgress = () => {
    const blob = new Blob([JSON.stringify(readStorage(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `saa-academy-progression-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage({ type: 'success', text: tr('Progression exportée.', 'Progress exported.') });
  };

  const importProgress = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error(tr('Fichier trop volumineux (5 Mo max).', 'File too large (5 MB max).'));
      saveStorage(parseImportedStorage(await file.text()));
      setMessage({ type: 'success', text: tr('Progression importée.', 'Progress imported.') });
    } catch (error) {
      setMessage({ type: 'error', text: `${tr('Import impossible :', 'Import failed:')} ${error.message}` });
    }
  };

  const reset = () => {
    if (!confirmReset) { setConfirmReset(true); return; }
    resetStorage();
    setConfirmReset(false);
    setMessage({ type: 'success', text: tr('Progression réinitialisée. Une sauvegarde de l’état précédent a été conservée.', 'Progress reset. A backup of the previous state was kept.') });
  };

  const restore = () => {
    try {
      restoreStorageBackup();
      setMessage({ type: 'success', text: tr('Sauvegarde restaurée.', 'Backup restored.') });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={tr('Profil', 'Profile')} description={tr('Statistiques, badges, préférences et sauvegarde de votre progression locale.', 'Statistics, badges, preferences and backup of your local progress.')} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={tr('Niveau', 'Level')} value={stats.level} hint={`${stats.xp} XP · ${xpForNextLevel(stats.xp)} XP ${tr('avant le suivant', 'to next')}`} icon={Award} />
        <StatCard label={tr('Série', 'Streak')} value={`${stats.streak} ${tr('j', 'd')}`} icon={Flame} />
        <StatCard label={tr('Précision', 'Accuracy')} value={`${accuracy}%`} hint={`${stats.correctAnswers}/${stats.questionsAnswered}`} />
        <StatCard label={tr('Révisions dues', 'Due reviews')} value={due} hint={`${revisionQueue.length} ${tr('cartes suivies', 'tracked cards')}`} />
      </div>

      <section className="card" aria-labelledby="badges-title">
        <h2 id="badges-title" className="mb-4 text-lg font-bold">{tr('Badges', 'Badges')}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(BADGE_TEXT).map(([id, [nameFr, nameEn, descFr, descEn]]) => {
            const earned = badges.find((badge) => badge.id === id)?.earned;
            return (
              <li key={id} className={`rounded-xl border p-3 ${earned ? 'border-primary bg-primary/10' : 'border-border-light opacity-70 dark:border-border-dark'}`}>
                <Award className={`mb-2 h-6 w-6 ${earned ? 'text-primary' : 'text-text-muted'}`} aria-hidden="true" />
                <p className="font-semibold">{tr(nameFr, nameEn)}</p>
                <p className="text-xs text-text-muted">{tr(descFr, descEn)}</p>
                <p className="mt-1 text-xs font-medium">{earned ? tr('Obtenu', 'Earned') : tr('À obtenir', 'Locked')}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card" aria-labelledby="history-title">
        <h2 id="history-title" className="mb-4 text-lg font-bold">{tr('Historique des examens', 'Exam history')}</h2>
        {examHistory.length === 0 ? <p className="text-text-muted">{tr('Aucun examen pour le moment.', 'No exam yet.')}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{tr('Derniers examens', 'Latest exams')}</caption>
              <thead><tr className="border-b border-border-light dark:border-border-dark"><th scope="col" className="py-2">{tr('Date', 'Date')}</th><th scope="col">{tr('Mode', 'Mode')}</th><th scope="col">{tr('Questions', 'Questions')}</th><th scope="col">{tr('Score', 'Score')}</th></tr></thead>
              <tbody>
                {examHistory.slice(0, 20).map((exam) => (
                  <tr key={exam.id} className="border-b border-border-light dark:border-border-dark">
                    <td className="py-2">{new Date(exam.finishedAt).toLocaleString(language)}</td>
                    <td>{{ official: tr('Officiel', 'Official'), simulation: 'Simulation', practice: tr('Entraînement', 'Practice') }[exam.mode]}</td>
                    <td>{exam.questionCount}</td>
                    <td className={exam.passed ? 'font-semibold text-success' : 'font-semibold text-error'}>{exam.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card grid gap-4 md:grid-cols-3" aria-labelledby="prefs-title">
        <h2 id="prefs-title" className="text-lg font-bold md:col-span-3">{tr('Préférences', 'Preferences')}</h2>
        <Select id="pref-language" label={tr('Langue', 'Language')} value={language} onChange={setLanguage} options={[{ value: 'fr', label: 'Français' }, { value: 'en', label: 'English' }]} />
        <Select id="pref-theme" label={tr('Thème', 'Theme')} value={theme} onChange={setTheme} options={[{ value: 'system', label: tr('Système', 'System') }, { value: 'dark', label: tr('Sombre', 'Dark') }, { value: 'light', label: tr('Clair', 'Light') }]} />
        <label htmlFor="pref-target" className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{tr('Date d’examen visée', 'Target exam date')}</span>
          <input
            id="pref-target"
            type="date"
            className="input py-2"
            value={storage.examPlan?.targetDate?.slice(0, 10) || ''}
            onChange={(event) => updateStorage((current) => ({
              ...current,
              examPlan: event.target.value ? { chaptersPerWeek: 3, quizPerDay: 20, ...current.examPlan, targetDate: new Date(`${event.target.value}T09:00:00`).toISOString() } : null,
            }))}
          />
        </label>
      </section>

      <section className="card space-y-3" aria-labelledby="data-title">
        <h2 id="data-title" className="text-lg font-bold">{tr('Données locales', 'Local data')}</h2>
        <p className="text-sm text-text-muted">{tr('Votre progression est stockée uniquement dans ce navigateur. Exportez-la pour la sauvegarder ou la transférer.', 'Your progress is stored only in this browser. Export it to back it up or move it.')}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" onClick={exportProgress}><Download className="h-4 w-4" aria-hidden="true" />{tr('Exporter (JSON)', 'Export (JSON)')}</button>
          <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" aria-hidden="true" />{tr('Importer', 'Import')}</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={importProgress} aria-label={tr('Fichier de progression à importer', 'Progress file to import')} />
          <button type="button" className="btn btn-secondary" onClick={restore}><RotateCcw className="h-4 w-4" aria-hidden="true" />{tr('Restaurer la sauvegarde précédente', 'Restore previous backup')}</button>
          <button type="button" className="btn btn-danger" onClick={reset}>{confirmReset ? tr('Confirmer la réinitialisation', 'Confirm reset') : tr('Réinitialiser', 'Reset')}</button>
          {confirmReset && <button type="button" className="btn btn-ghost" onClick={() => setConfirmReset(false)}>{tr('Annuler', 'Cancel')}</button>}
        </div>
        {message && <p role={message.type === 'error' ? 'alert' : 'status'} className={message.type === 'error' ? 'text-error' : 'text-success'}>{message.text}</p>}
        <div>
          <p className="mb-1 text-sm">{tr('Cours lus', 'Courses read')} {stats.chaptersRead}/{CONTENT_TOTALS.courses} · Labs {stats.labsCompleted}/{CONTENT_TOTALS.labs}</p>
          <ProgressBar value={stats.chaptersRead + stats.labsCompleted} max={CONTENT_TOTALS.courses + CONTENT_TOTALS.labs} label={tr('Progression globale', 'Overall progress')} />
        </div>
      </section>
    </div>
  );
}
