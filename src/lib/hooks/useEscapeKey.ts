"use client";

import { useEffect } from "react";

/**
 * Closes a modal on Escape — a real, concrete keyboard-accessibility
 * gap found during the Group 4 dialog audit: neither of this app's two
 * existing modals (AddBusinessModal, AdminManagementTable's confirm/
 * create dialogs) had any Escape handling at all. One shared hook,
 * reused across all of them, rather than three separate copies of the
 * same effect.
 */
export function useEscapeKey(onEscape: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onEscape();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onEscape, enabled]);
}
