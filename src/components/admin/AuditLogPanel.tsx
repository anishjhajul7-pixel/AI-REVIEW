"use client";

import { useState, useTransition } from "react";
import { searchAuditLogs, type AuditLogRow } from "@/app/admin/auditLogActions";
import { Input } from "@/components/ui/Field";
import { maskEmail } from "@/lib/admin/mask";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function AuditLogPanel({ initialRows, initialTotalPages }: { initialRows: AuditLogRow[]; initialTotalPages: number }) {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [resultFilter, setResultFilter] = useState<"all" | "success" | "failure">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [isPending, startTransition] = useTransition();

  function runSearch(q: string, filter: typeof resultFilter, p: number) {
    startTransition(async () => {
      const result = await searchAuditLogs(q, filter, p);
      if ("data" in result) {
        setRows(result.data);
        setPage(result.page);
        setTotalPages(result.totalPages);
      }
    });
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query, resultFilter, 1);
        }}
        className="flex flex-wrap gap-2"
      >
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by action or target type…"
          className="flex-1"
        />
        <select
          value={resultFilter}
          onChange={(e) => {
            const v = e.target.value as typeof resultFilter;
            setResultFilter(v);
            runSearch(query, v, 1);
          }}
          className="rounded-[var(--radius-sm)] border border-border-strong bg-paper-raised px-2.5 py-2 text-sm text-ink shadow-xs transition-all focus:border-verified focus:outline-none focus:ring-4 focus:ring-verified/15"
        >
          <option value="all">All results</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
        </select>
      </form>

      <div className="mt-4 overflow-x-auto rounded-[var(--radius-md)] border border-border-strong">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-ink/[0.02] text-left font-mono text-[10px] uppercase tracking-wider text-slate">
              <th className="px-4 py-2.5">Admin</th>
              <th className="px-4 py-2.5">Action</th>
              <th className="px-4 py-2.5">Target</th>
              <th className="px-4 py-2.5">Result</th>
              <th className="px-4 py-2.5">When</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate">
                  No audit log entries match your search.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-ink-soft">{maskEmail(r.adminEmail)}</td>
                  <td className="px-4 py-3 font-medium text-ink">{r.action}</td>
                  <td className="px-4 py-3 text-ink-soft">{r.targetType ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${
                        r.result === "success" ? "bg-success-tint text-success-dark" : "bg-danger-tint text-danger"
                      }`}
                    >
                      {r.result}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate">{timeAgo(r.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            disabled={isPending || page <= 1}
            onClick={() => runSearch(query, resultFilter, page - 1)}
            className="text-verified disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-slate">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={isPending || page >= totalPages}
            onClick={() => runSearch(query, resultFilter, page + 1)}
            className="text-verified disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
