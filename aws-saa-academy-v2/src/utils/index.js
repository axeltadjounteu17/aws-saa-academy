export * from './storage';
export * from './exam';
export * from './search';
export * from './ai';
export * from './progress/learning';
export * from './i18n';

export * as storage from './storage';
export * as exam from './exam';
export * as search from './search';
export * as ai from './ai';

export function cn(...values) {
  return values.flatMap((value) => {
    if (!value) return [];
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'object') return Object.entries(value).filter(([, enabled]) => enabled).map(([className]) => className);
    return [];
  }).join(' ');
}
