import { useState, useEffect } from 'react';

export const useResponsivePageSize = (): number => {
  const calculatePageSize = (): number => {
    if (typeof window === 'undefined') return 9;

    const width = window.innerWidth;
    const height = window.innerHeight;

    let cols = 3;
    if (width < 720) {
      cols = 1;
    } else if (width < 1050) {
      cols = 2;
    }

    const availableHeight = height - 170;

    let rows = 3;
    if (availableHeight < 450) {
      rows = 2;
    } else if (availableHeight >= 760) {
      rows = 3;
    } else {
      rows = 2;
    }

    if (cols === 1) {
      return Math.max(3, Math.min(4, Math.floor(availableHeight / 175)));
    }

    return Math.max(2, cols * rows);
  };

  const [pageSize, setPageSize] = useState<number>(calculatePageSize);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setPageSize(calculatePageSize());
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return pageSize;
};

export default useResponsivePageSize;
