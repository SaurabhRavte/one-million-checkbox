import { useRef, useCallback, useState } from "react";
import { api } from "../lib/api";

export const TOTAL = 1_000_000;
const VIEWPORT_SIZE = 10_000; // load 10k at a time

// Compact bit storage: 1 bit per checkbox
// Store in Uint8Array: 125,000 bytes for 1M checkboxes

export function useCheckboxState(token: string | null) {
  // Full bitfield - loaded lazily per viewport
  const bitfield = useRef<Uint8Array>(new Uint8Array(Math.ceil(TOTAL / 8)));
  const [checkedCount, setCheckedCount] = useState(0);
  const [loadedRanges, setLoadedRanges] = useState<Set<number>>(new Set());

  const getBit = useCallback((index: number): boolean => {
    const byteIndex = Math.floor(index / 8);
    const bitOffset = 7 - (index % 8);
    return ((bitfield.current[byteIndex] >> bitOffset) & 1) === 1;
  }, []);

  const setBit = useCallback((index: number, value: boolean) => {
    const byteIndex = Math.floor(index / 8);
    const bitOffset = 7 - (index % 8);
    if (value) {
      bitfield.current[byteIndex] |= (1 << bitOffset);
    } else {
      bitfield.current[byteIndex] &= ~(1 << bitOffset);
    }
  }, []);

  const toggleLocal = useCallback((index: number): boolean => {
    const current = getBit(index);
    const next = !current;
    setBit(index, next);
    setCheckedCount(prev => prev + (next ? 1 : -1));
    return next;
  }, [getBit, setBit]);

  const applyRemoteUpdate = useCallback((index: number, checked: boolean) => {
    const current = getBit(index);
    if (current !== checked) {
      setBit(index, checked);
      setCheckedCount(prev => prev + (checked ? 1 : -1));
    }
  }, [getBit, setBit]);

  // Load a viewport chunk from server
  const loadViewport = useCallback(async (startIndex: number) => {
    const chunkKey = Math.floor(startIndex / VIEWPORT_SIZE);
    if (loadedRanges.has(chunkKey)) return;

    try {
      const res = await api.checkbox.getViewport(startIndex, VIEWPORT_SIZE, token);
      const { data } = res.data;

      // Decode base64 into bytes and merge into bitfield
      const bytes = atob(data);
      const startByte = Math.floor(startIndex / 8);
      let count = 0;
      for (let i = 0; i < bytes.length; i++) {
        const b = bytes.charCodeAt(i);
        bitfield.current[startByte + i] = b;
        // Count set bits
        let tmp = b;
        while (tmp) { count += tmp & 1; tmp >>= 1; }
      }

      setLoadedRanges(prev => new Set([...prev, chunkKey]));
      // Update checked count for this range
      setCheckedCount(prev => {
        // Rough adjustment - just recalculate from full bitfield
        let total = 0;
        for (let i = 0; i < bitfield.current.length; i++) {
          let tmp = bitfield.current[i];
          while (tmp) { total += tmp & 1; tmp >>= 1; }
        }
        return total;
      });
    } catch (e) {
      console.error("[Checkbox] Failed to load viewport:", e);
    }
  }, [token, loadedRanges]);

  return { getBit, setBit, toggleLocal, applyRemoteUpdate, loadViewport, checkedCount };
}
