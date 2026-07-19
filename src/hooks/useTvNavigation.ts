import { useState, useCallback, useRef, useEffect } from 'react';

export interface FocusPosition {
  rowIndex: number;
  cardIndex: number;
}

export function useTvNavigation(rowCount: number, getCardCount: (rowIndex: number) => number, hasHero: boolean = true) {
  const [focus, setFocus] = useState<FocusPosition>({ rowIndex: 0, cardIndex: 0 });
  const [isNavigating, setIsNavigating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clampCardIndex = useCallback((rowIndex: number, cardIndex: number): number => {
    if (rowIndex === -1) return 0;
    const count = getCardCount(rowIndex);
    if (count === 0) return 0;
    return Math.max(0, Math.min(cardIndex, count - 1));
  }, [getCardCount]);

  const clampRowIndex = useCallback((rowIndex: number): number => {
    return Math.max(0, Math.min(rowIndex, rowCount - 1));
  }, [rowCount]);

  const scrollCardIntoView = useCallback((rowIndex: number, cardIndex: number) => {
    if (rowIndex === -1) {
      const hero = document.querySelector<HTMLElement>('[data-hero]');
      if (hero) {
        hero.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    const container = document.querySelector(`[data-row="${rowIndex}"]`);
    const card = container?.querySelector(`[data-card="${cardIndex}"]`);
    if (card) {
      card.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, []);

  const navigate = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    setFocus(prev => {
      let newRow = prev.rowIndex;
      let newCard = prev.cardIndex;

      switch (direction) {
        case 'left':
          if (prev.rowIndex === -1) break;
          newCard = prev.cardIndex - 1;
          if (newCard < 0) {
            newCard = Math.max(0, getCardCount(prev.rowIndex) - 1);
          }
          break;
        case 'right':
          if (prev.rowIndex === -1) break;
          newCard = prev.cardIndex + 1;
          if (newCard >= getCardCount(prev.rowIndex)) {
            newCard = 0;
          }
          break;
        case 'up':
          if (prev.rowIndex === -1) break;
          if (hasHero && prev.rowIndex === 0) {
            newRow = -1;
            newCard = 0;
          } else if (prev.rowIndex === 0) {
            break;
          } else {
            newRow = clampRowIndex(prev.rowIndex - 1);
            newCard = clampCardIndex(newRow, prev.cardIndex);
          }
          break;
        case 'down':
          if (prev.rowIndex === -1) {
            newRow = 0;
            newCard = clampCardIndex(0, 0);
          } else {
            newRow = clampRowIndex(prev.rowIndex + 1);
            newCard = clampCardIndex(newRow, prev.cardIndex);
          }
          break;
      }

      setTimeout(() => scrollCardIntoView(newRow, newCard), 50);
      return { rowIndex: newRow, cardIndex: newCard };
    });
  }, [clampRowIndex, clampCardIndex, getCardCount, scrollCardIntoView, hasHero]);

  const setFocusPosition = useCallback((rowIndex: number, cardIndex: number) => {
    setFocus({
      rowIndex: clampRowIndex(rowIndex),
      cardIndex: clampCardIndex(rowIndex, cardIndex),
    });
    setTimeout(() => scrollCardIntoView(rowIndex, cardIndex), 50);
  }, [clampRowIndex, clampCardIndex, scrollCardIntoView]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          navigate('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigate('right');
          break;
        case 'ArrowUp':
          e.preventDefault();
          navigate('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          navigate('down');
          break;
      }

      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        setIsNavigating(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setIsNavigating(false), 300);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  return {
    focus,
    heroFocused: focus.rowIndex === -1,
    isNavigating,
    navigate,
    setFocusPosition,
  };
}
