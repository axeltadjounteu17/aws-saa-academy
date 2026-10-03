import { useCallback, useEffect, useState } from 'react';
import { dispatchLearningEvent, readStorage, subscribeStorage, updateStorage } from '../utils/storage/store';

function createEventId(type) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${type}:${random}`;
}

/**
 * État persistant unique de l'application (stockage v2 validé par Zod).
 * Toute écriture passe par le store, qui notifie les abonnés (y compris les autres onglets).
 */
export function useAppStorage() {
  const [storage, setStorage] = useState(readStorage);

  useEffect(() => subscribeStorage((next) => setStorage(next)), []);

  const update = useCallback((updater) => updateStorage(updater), []);

  const emit = useCallback((type, payload = {}, id = createEventId(type)) => (
    dispatchLearningEvent({ id, type, payload })
  ), []);

  const setPreference = useCallback((key, value) => (
    updateStorage((current) => ({ ...current, preferences: { ...current.preferences, [key]: value } }))
  ), []);

  return { storage, update, emit, setPreference };
}

export default useAppStorage;
