import { useState, useCallback } from "react";

export function useToggle(initial = false) {
  const [open, setOpen] = useState<boolean>(initial);
  const openFn = useCallback(() => setOpen(true), []);
  const closeFn = useCallback(() => setOpen(false), []);
  const toggleFn = useCallback(() => setOpen(v => !v), []);
  return { open, openFn, closeFn, toggleFn, setOpen };
}
