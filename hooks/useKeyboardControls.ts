import { useEffect, useRef } from "react";

const MOVEMENT_KEYS = new Set([
  "z",
  "s",
  "q",
  "d",
  "a",
  "e",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

export function useKeyboardControls() {
  const keysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const isInputFocused = (e: KeyboardEvent) =>
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused(e)) return;
      const key = e.key;
      if (MOVEMENT_KEYS.has(key)) {
        e.preventDefault();
        keysRef.current.add(key);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };

    const onBlur = () => {
      keysRef.current.clear();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return keysRef;
}
