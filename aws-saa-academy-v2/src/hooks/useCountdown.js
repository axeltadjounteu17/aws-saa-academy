import { useEffect, useRef, useState } from 'react';

/**
 * Compte à rebours basé sur une échéance absolue (résiste aux onglets en arrière-plan).
 * onExpire est appelé une seule fois quand l'échéance est atteinte.
 */
export function useCountdown(deadline, onExpire) {
  const [now, setNow] = useState(() => Date.now());
  const expireRef = useRef(onExpire);
  const firedRef = useRef(false);

  useEffect(() => {
    expireRef.current = onExpire;
  });

  useEffect(() => {
    firedRef.current = false;
    if (!deadline) return undefined;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline && !firedRef.current) {
        firedRef.current = true;
        expireRef.current?.();
      }
    };
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  return deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;
}

export default useCountdown;
