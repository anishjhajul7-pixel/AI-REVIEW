"use client";

import { useState, useTransition } from "react";
import { enrollMfaFactor, verifyMfaEnrollment, unenrollOwnMfaFactor, type MfaFactor } from "@/app/admin/mfaActions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

export function MfaEnrollmentPanel({ initialFactors }: { initialFactors: MfaFactor[] }) {
  const [factors, setFactors] = useState(initialFactors);
  const [enrolling, setEnrolling] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const verifiedFactor = factors.find((f) => f.status === "verified");

  function handleEnroll() {
    setError(null);
    startTransition(async () => {
      const result = await enrollMfaFactor();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setEnrolling(result.data);
    });
  }

  function handleVerify() {
    if (!enrolling) return;
    setError(null);
    startTransition(async () => {
      const result = await verifyMfaEnrollment(enrolling.factorId, code);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setFactors((prev) => [...prev, { id: enrolling.factorId, status: "verified", createdAt: new Date().toISOString() }]);
      setEnrolling(null);
      setCode("");
    });
  }

  function handleUnenroll(factorId: string) {
    setError(null);
    startTransition(async () => {
      const result = await unenrollOwnMfaFactor(factorId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setFactors((prev) => prev.filter((f) => f.id !== factorId));
    });
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-border-strong bg-paper-raised p-5 shadow-xs">
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      {verifiedFactor ? (
        <div>
          <p className="text-sm text-ink">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-success" />
            Two-factor authentication is enabled.
          </p>
          <div className="mt-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => handleUnenroll(verifiedFactor.id)} loading={isPending}>
              Remove two-factor authentication
            </Button>
          </div>
        </div>
      ) : enrolling ? (
        <div>
          <p className="text-sm text-ink">Scan this code with your authenticator app:</p>
          {/* Supabase returns an inline SVG data URI for the QR code */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrolling.qrCode} alt="MFA enrollment QR code" className="mt-3 h-40 w-40" />
          <p className="mt-2 text-xs text-slate">
            Or enter this key manually: <span className="font-mono">{enrolling.secret}</span>
          </p>
          <div className="mt-3 flex gap-2">
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="6-digit code"
              className="w-32"
            />
            <Button type="button" size="sm" onClick={handleVerify} disabled={code.length !== 6} loading={isPending}>
              Verify &amp; Enable
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEnrolling(null);
                setCode("");
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-ink-soft">
            Two-factor authentication is not enabled for your account.
          </p>
          <div className="mt-3">
            <Button type="button" size="sm" onClick={handleEnroll} loading={isPending}>
              Set Up Two-Factor Authentication
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
