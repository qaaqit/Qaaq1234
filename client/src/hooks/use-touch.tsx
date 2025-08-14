
import { useState, useEffect, useRef } from 'react';

interface TouchPosition {
  x: number;
  y: number;
}

interface SwipeDirection {
  direction: 'left' | 'right' | 'up' | 'down' | null;
  distance: number;
}

export function useSwipe(threshold: number = 50) {
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>({
    direction: null,
    distance: 0
  });
  
  const touchStart = useRef<TouchPosition>({ x: 0, y: 0 });
  const touchEnd = useRef<TouchPosition>({ x: 0, y: 0 });

  const onTouchStart = (e: TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const onTouchMove = (e: TouchEvent) => {
    touchEnd.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const onTouchEnd = () => {
    const deltaX = touchStart.current.x - touchEnd.current.x;
    const deltaY = touchStart.current.y - touchEnd.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance < threshold) {
      setSwipeDirection({ direction: null, distance: 0 });
      return;
    }

    let direction: 'left' | 'right' | 'up' | 'down';
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'left' : 'right';
    } else {
      direction = deltaY > 0 ? 'up' : 'down';
    }

    setSwipeDirection({ direction, distance });
  };

  return {
    swipeDirection,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    resetSwipe: () => setSwipeDirection({ direction: null, distance: 0 })
  };
}

export function useLongPress(
  callback: () => void,
  duration: number = 500
) {
  const [isPressed, setIsPressed] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();
  const isLongPress = useRef(false);

  const start = () => {
    setIsPressed(true);
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      callback();
    }, duration);
  };

  const stop = () => {
    setIsPressed(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    isPressed,
    isLongPress: isLongPress.current,
    handlers: {
      onMouseDown: start,
      onMouseUp: stop,
      onMouseLeave: stop,
      onTouchStart: start,
      onTouchEnd: stop,
    }
  };
}
