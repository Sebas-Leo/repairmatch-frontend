import { useSyncExternalStore } from 'react';

const KEY = 'rm.technician.available';
const EVENT = 'rm:availability';

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'false';
  } catch {
    return true;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/**
 * "Disponible hoy": a preference kept on this device. The backend has no
 * such field yet, so it changes what the technician sees, not what clients
 * see. The navbar pill and the drawer share it through this hook.
 */
export function useAvailability(): [boolean, (next: boolean) => void] {
  const available = useSyncExternalStore(subscribe, read, () => true);
  function set(next: boolean) {
    try {
      localStorage.setItem(KEY, String(next));
    } catch {
      // Private mode: nothing to persist.
    }
    window.dispatchEvent(new Event(EVENT));
  }
  return [available, set];
}
