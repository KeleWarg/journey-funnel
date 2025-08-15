import { useState } from 'react';
import { renderHook, act } from '@testing-library/react';
import { useDebounce, useDebouncedCallback } from '../../hooks/use-debounce';

describe('Performance Optimizations', () => {
  describe('useDebounce Hook', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce value changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 300 } }
      );

      expect(result.current).toBe('initial');

      // Change value multiple times rapidly
      rerender({ value: 'change1', delay: 300 });
      rerender({ value: 'change2', delay: 300 });
      rerender({ value: 'final', delay: 300 });

      // Should still have initial value before timeout
      expect(result.current).toBe('initial');

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should now have the final value
      expect(result.current).toBe('final');
    });

    it('should reset timer on value change', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 300 } }
      );

      rerender({ value: 'change1', delay: 300 });
      
      // Advance time partially
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Change value again, should reset timer
      rerender({ value: 'change2', delay: 300 });

      // Advance only 200ms more (400ms total, but timer was reset)
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Should still have initial value
      expect(result.current).toBe('initial');

      // Advance final 100ms to complete the 300ms from reset
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Now should have the final value
      expect(result.current).toBe('change2');
    });
  });

  describe('useDebouncedCallback Hook', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce callback updates', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const { result, rerender } = renderHook(
        ({ callback, delay }) => useDebouncedCallback(callback, delay),
        { initialProps: { callback: callback1, delay: 300 } }
      );

      // Execute the initial debounced callback
      result.current();
      expect(callback1).toHaveBeenCalled();

      // Change callback
      rerender({ callback: callback2, delay: 300 });

      // Execute immediately (should still use old callback until timeout)
      result.current();
      expect(callback1).toHaveBeenCalledTimes(2); // Called twice now

      // Fast-forward time to update the debounced callback
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Now execute with the updated callback
      result.current();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('Performance Metrics', () => {
    it('should complete debounce operations within acceptable time', () => {
      const start = performance.now();
      
      // Simulate rapid state changes
      const values = Array.from({ length: 100 }, (_, i) => `value${i}`);
      
      const { result } = renderHook(() => {
        const [value, setValue] = useState('initial');
        const debouncedValue = useDebounce(value, 50);
        return { value, setValue, debouncedValue };
      });

      // Rapidly change values
      act(() => {
        values.forEach(v => {
          result.current.setValue(v);
        });
      });

      const end = performance.now();
      const duration = end - start;

      // Should complete rapidly (not execute 100 separate timers)
      expect(duration).toBeLessThan(100); // Should be much faster than 100ms
    });
  });
});

