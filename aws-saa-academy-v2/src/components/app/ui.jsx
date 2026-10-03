import { Link } from 'react-router-dom';
import { getDomainLabel } from '../../types';

const DOMAIN_TONES = {
  D1: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
  D2: 'bg-green-500/10 text-green-700 dark:text-green-300',
  D3: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  D4: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
};

export function PageHeader({ title, description, actions, eyebrow }) {
  return (
    <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-sm font-medium text-primary">{eyebrow}</p>}
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ as: Tag = 'section', className = '', children, ...props }) {
  return <Tag className={`card ${className}`} {...props}>{children}</Tag>;
}

export function StatCard({ label, value, hint, icon: Icon }) {
  return (
    <div className="card flex items-start gap-3 p-4">
      {Icon && <Icon className="mt-1 h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />}
      <div>
        <p className="text-sm text-text-muted">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {hint && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
    </div>
  );
}

export function DomainBadge({ domain, language = 'fr', short = false }) {
  if (!domain) return null;
  return (
    <span className={`badge ${DOMAIN_TONES[domain] || 'bg-background-darker'}`} title={getDomainLabel(domain, language)}>
      {short ? domain : `${domain} · ${getDomainLabel(domain, language)}`}
    </span>
  );
}

export function ProgressBar({ value, max = 100, label, showValue = false }) {
  const percent = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="progress-bar flex-1" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
      </div>
      {showValue && <span className="w-10 text-right text-xs text-text-muted">{percent}%</span>}
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state card">
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-description">{description}</p>}
      {action}
    </div>
  );
}

export function FallbackNotice({ language, show }) {
  if (!show || language !== 'en') return null;
  return (
    <span className="badge bg-warning/15 text-yellow-700 dark:text-warning" lang="en">
      French content (translation pending)
    </span>
  );
}

export function ButtonLink({ to, variant = 'primary', children, ...props }) {
  return <Link to={to} className={`btn btn-${variant}`} {...props}>{children}</Link>;
}

export function Select({ id, label, value, onChange, options }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="input py-2">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
