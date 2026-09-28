import { useEffect, useState } from 'react';
import { getCurrentYear, untilNextHongKongDay } from './currentYear';
export function useCurrentYear() {
  const [year, setYear] = useState(getCurrentYear);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      setYear(getCurrentYear());
      clearTimeout(timer);
      timer = setTimeout(check, untilNextHongKongDay());
    };
    const visible = () => {
      if (document.visibilityState === 'visible') check();
    };
    check();
    document.addEventListener('visibilitychange', visible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);
  return year;
}
