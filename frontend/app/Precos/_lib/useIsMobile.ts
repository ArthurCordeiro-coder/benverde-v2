import { useEffect, useState } from "react";

// Returns true when the viewport is phone-width. SSR-safe (defaults to false).
export function useIsMobile(breakpoint = 760): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth <= breakpoint);
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  return mobile;
}
