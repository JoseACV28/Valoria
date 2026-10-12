import {useEffect,useRef,useState} from 'react';

// Keep inline popovers within the visible viewport, including mobile keyboards.
export function usePopoverSpace(open, bottomReserve = 24) {
  const ref = useRef(null);
  const [height,setHeight] = useState(540);
  useEffect(() => {
    if (!open) return;
    function fit() {
      const top = ref.current?.getBoundingClientRect().top ?? 0;
      const viewport = window.visualViewport;
      const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      setHeight(Math.max(64, bottom - top - bottomReserve));
    }
    fit();
    window.addEventListener('resize',fit);
    window.visualViewport?.addEventListener('resize',fit);
    return () => {
      window.removeEventListener('resize',fit);
      window.visualViewport?.removeEventListener('resize',fit);
    };
  },[open,bottomReserve]);
  return [ref,height];
}
