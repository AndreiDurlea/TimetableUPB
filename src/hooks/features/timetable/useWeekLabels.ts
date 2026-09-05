import { useEffect, useCallback } from 'react';

export const useWeekLabels = (
    gridRef: React.RefObject<HTMLDivElement | null>,
    containerRef: React.RefObject<HTMLDivElement | null>,
    separatorRef: React.RefObject<HTMLDivElement | null>,
    label1Ref: React.RefObject<HTMLDivElement | null>,
    label2Ref: React.RefObject<HTMLDivElement | null>
) => {
    const handleScroll = useCallback(() => {
        if (!gridRef.current || !containerRef.current || !separatorRef.current || !label1Ref.current || !label2Ref.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const sepRect = separatorRef.current.getBoundingClientRect();
        const center = containerRect.width / 2;
        const sepLeft = sepRect.left - containerRect.left;
        const sepWidth = sepRect.width;

        const label1Width = label1Ref.current.offsetWidth || 180;
        const label2Width = label2Ref.current.offsetWidth || 180;

        const transitionHalfWidth = 150;
        const transitionStart = center - transitionHalfWidth;
        const transitionEnd = center + transitionHalfWidth;

        if (sepLeft >= transitionEnd) {
            // Fully viewing Week 1
            label1Ref.current.style.left = `${center}px`;
            label1Ref.current.style.opacity = '1';
            label2Ref.current.style.opacity = '0';
        } else if (sepLeft <= transitionStart) {
            // Fully viewing Week 2
            label2Ref.current.style.left = `${center}px`;
            label2Ref.current.style.opacity = '1';
            label1Ref.current.style.opacity = '0';
        } else {
            // Transitioning across separator
            const t = (sepLeft - transitionStart) / (transitionEnd - transitionStart); // 0 (week 2) to 1 (week 1)

            const limit1 = sepLeft - 15 - label1Width / 2;
            const pos1 = Math.min(center, limit1);
            label1Ref.current.style.left = `${pos1}px`;
            label1Ref.current.style.opacity = `${Math.max(0, Math.min(1, t))}`;

            const limit2 = sepLeft + sepWidth + 15 + label2Width / 2;
            const pos2 = Math.max(center, limit2);
            label2Ref.current.style.left = `${pos2}px`;
            label2Ref.current.style.opacity = `${Math.max(0, Math.min(1, 1 - t))}`;
        }
    }, [gridRef, containerRef, separatorRef, label1Ref, label2Ref]);

    useEffect(() => {
        const grid = gridRef.current;
        const container = containerRef.current;
        if (!grid) return;

        grid.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll);

        const rafId = requestAnimationFrame(handleScroll);
        const timerId = setTimeout(handleScroll, 100);

        let ro: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined' && container) {
            ro = new ResizeObserver(() => handleScroll());
            ro.observe(container);
        }

        return () => {
            grid.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
            cancelAnimationFrame(rafId);
            clearTimeout(timerId);
            if (ro) ro.disconnect();
        };
    }, [gridRef, containerRef, handleScroll]);
};
