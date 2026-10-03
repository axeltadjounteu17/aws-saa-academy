import { useEffect, useState } from 'react';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia?.(DARK_QUERY).matches;
}

/**
 * Applique le thème choisi (« light », « dark » ou « system ») sur <html>.
 * La préférence elle-même est persistée dans le stockage v2 par l'appelant.
 */
export function useTheme(theme = 'system') {
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark);

  useEffect(() => {
    const media = window.matchMedia?.(DARK_QUERY);
    if (!media) return undefined;
    const handleChange = (event) => setPrefersDark(event.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
  }, [isDark]);

  return { isDark };
}

export default useTheme;
