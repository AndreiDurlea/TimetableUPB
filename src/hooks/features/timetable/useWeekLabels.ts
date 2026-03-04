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

        const label1Width = label1Ref.current.offsetWidth;
        const label2Width = label2Ref.current.offsetWidth;

        const target1 = center;
        const limit1 = sepLeft - 15 - label1Width / 2;
        const pos1 = Math.min(target1, limit1);
        label1Ref.current.style.left = `${pos1}px`;

        const target2 = center;
        const limit2 = sepLeft + sepWidth + 15 + label2Width / 2;
        const pos2 = Math.max(target2, limit2);
        label2Ref.current.style.left = `${pos2}px`;
    }, [gridRef, containerRef, separatorRef, label1Ref, label2Ref]);

    useEffect(() => {
        const grid = gridRef.current;
        if (grid) {
            grid.addEventListener('scroll', handleScroll, { passive: true });
            window.addEventListener('resize', handleScroll);
            const scrollTimer = setTimeout(handleScroll, 0);

            return () => {
                grid.removeEventListener('scroll', handleScroll);
                window.removeEventListener('resize', handleScroll);
                clearTimeout(scrollTimer);
            };
        }
    }, [gridRef, handleScroll]);
};
