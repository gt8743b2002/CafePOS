import { useEffect } from 'react';

const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

export function useIdleLogout(active, onIdle) {
  useEffect(() => {
    if (!active) return;

    let timer = setTimeout(onIdle, IDLE_LIMIT_MS);
    function resetTimer() {
      clearTimeout(timer);
      timer = setTimeout(onIdle, IDLE_LIMIT_MS);
    }

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer));
    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [active, onIdle]);
}
