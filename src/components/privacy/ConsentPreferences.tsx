"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { ConsentChoice } from "@/lib/privacy/consent";

type ConsentPreferencesProps = {
  open: boolean;
  choice: ConsentChoice | "unknown";
  message: string;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
};

export function ConsentPreferences({
  open,
  choice,
  message,
  onAccept,
  onReject,
  onClose,
}: ConsentPreferencesProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      restoreFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      return;
    }
    if (!open && dialog.open) {
      dialog.close();
      restoreFocus.current?.focus();
    }
  }, [open]);

  const status = choice === "accepted"
    ? "Analytics is on for this browser."
    : choice === "rejected"
      ? "Analytics is off for this browser."
      : "Analytics is off until you choose.";

  return (
    <dialog
      ref={dialogRef}
      className="consent-dialog"
      aria-labelledby="privacy-preferences-title"
      aria-describedby="privacy-preferences-status"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <div className="consent-dialog-panel">
        <div className="consent-dialog-heading">
          <h2 id="privacy-preferences-title" className="consent-title">Privacy preferences</h2>
          <button type="button" className="consent-close focus-ring" onClick={onClose}>
            Close
          </button>
        </div>
        <p id="privacy-preferences-status" className="consent-status">{status}</p>
        <p className="consent-text">
          We use optional analytics to understand how visitors use our website and improve the experience. You can accept or reject analytics, and change your choice anytime.
        </p>
        {message ? <p className="consent-note" role="status">{message}</p> : null}
        <div className="consent-actions">
          <button type="button" className="consent-button consent-button-reject focus-ring" onClick={onReject}>
            Reject Analytics
          </button>
          <button type="button" className="consent-button consent-button-accept focus-ring" onClick={onAccept}>
            Accept Analytics
          </button>
          <Link href="/privacy" className="consent-policy-link focus-ring" onClick={onClose}>
            Privacy Policy
          </Link>
        </div>
      </div>
    </dialog>
  );
}
