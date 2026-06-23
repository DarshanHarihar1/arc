import { useEffect, useState } from "react";

// True when the app is running as an installed PWA (home-screen / standalone).
// iOS exposes this via navigator.standalone; other browsers via display-mode.
export function useIsStandalone() {
  const [standalone, setStandalone] = useState(getStandalone);

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const onChange = () => setStandalone(getStandalone());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return standalone;
}

function getStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}
