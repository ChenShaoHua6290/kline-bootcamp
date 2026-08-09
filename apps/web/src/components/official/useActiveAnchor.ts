'use client';

import { useEffect, useState } from 'react';

export function useActiveAnchor(ids: string[]) {
  const [activeId, setActiveId] = useState(ids[0] ?? '');

  useEffect(() => {
    const fromHash = window.location.hash.replace('#', '');
    if (fromHash && ids.includes(fromHash)) setActiveId(fromHash);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-120px 0px -55% 0px', threshold: [0.15, 0.35, 0.6] },
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    const onHash = () => {
      const id = window.location.hash.replace('#', '');
      if (id && ids.includes(id)) setActiveId(id);
    };

    window.addEventListener('hashchange', onHash);
    return () => {
      observer.disconnect();
      window.removeEventListener('hashchange', onHash);
    };
  }, [ids]);

  return activeId;
}
