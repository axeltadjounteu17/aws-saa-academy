import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { PageHeader } from '../components/app/ui';

export default function Onboarding() {
  const navigate = useNavigate();
  const { language, setLanguage, updateStorage, tr } = useAppContext();
  const [targetDate, setTargetDate] = useState('');
  const [chaptersPerWeek, setChaptersPerWeek] = useState(3);
  const [quizPerDay, setQuizPerDay] = useState(20);

  const finish = (event) => {
    event.preventDefault();
    updateStorage((current) => ({
      ...current,
      onboardingCompleted: true,
      examPlan: targetDate ? { targetDate: new Date(`${targetDate}T09:00:00`).toISOString(), chaptersPerWeek: Number(chaptersPerWeek), quizPerDay: Number(quizPerDay) } : current.examPlan,
    }));
    navigate('/dashboard');
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={tr('Bienvenue', 'Welcome')} description={tr('Trois réglages pour personnaliser votre préparation. Vous pourrez les modifier dans le profil.', 'Three settings to personalize your preparation. You can change them later in your profile.')} />
      <form className="card space-y-5" onSubmit={finish}>
        <fieldset>
          <legend className="mb-2 font-semibold">{tr('Langue', 'Language')}</legend>
          <div className="flex gap-4">
            {[['fr', 'Français'], ['en', 'English']].map(([code, label]) => (
              <label key={code} className="flex items-center gap-2">
                <input type="radio" name="onboarding-language" value={code} checked={language === code} onChange={() => setLanguage(code)} className="accent-[#FF9900]" />
                <span lang={code}>{label}</span>
              </label>
            ))}
          </div>
          {language === 'en' && <p className="mt-2 text-sm text-text-muted">820 of 895 questions are currently shown in French, with a visible badge.</p>}
        </fieldset>
        <label htmlFor="onboarding-date" className="flex flex-col gap-1">
          <span className="font-semibold">{tr('Date d’examen visée (facultatif)', 'Target exam date (optional)')}</span>
          <input id="onboarding-date" type="date" className="input" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor="onboarding-chapters" className="flex flex-col gap-1">
            <span className="font-semibold">{tr('Chapitres par semaine', 'Chapters per week')}</span>
            <input id="onboarding-chapters" type="number" min="1" max="20" className="input" value={chaptersPerWeek} onChange={(event) => setChaptersPerWeek(event.target.value)} />
          </label>
          <label htmlFor="onboarding-quiz" className="flex flex-col gap-1">
            <span className="font-semibold">{tr('Questions par jour', 'Questions per day')}</span>
            <input id="onboarding-quiz" type="number" min="0" max="200" className="input" value={quizPerDay} onChange={(event) => setQuizPerDay(event.target.value)} />
          </label>
        </div>
        <button type="submit" className="btn btn-primary">{tr('Commencer la préparation', 'Start preparing')}</button>
      </form>
    </div>
  );
}
