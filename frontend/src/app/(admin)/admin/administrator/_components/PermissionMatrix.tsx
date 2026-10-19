'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { ModulePermission } from '@/lib/api';
import { CheckSquare, MinusSquare } from 'lucide-react';
import { MODULES, ACTIONS, type ActionKey } from './constants';

interface PermissionMatrixProps {
  permissions: ModulePermission[];
  onChange: (permissions: ModulePermission[]) => void;
  disabled?: boolean;
}

export function PermissionMatrix({ permissions, onChange, disabled = false }: PermissionMatrixProps) {
  // ── Lookup map ──────────────────────────────────────────────────────────
  const permMap: Record<string, ModulePermission> = {};
  for (const p of permissions) {
    permMap[p.module] = p;
  }

  const empty = (key: string): ModulePermission => ({
    module: key,
    view: false, create: false, edit: false, delete: false, manage: false, export: false,
  });

  const get = (moduleKey: string, action: ActionKey): boolean =>
    Boolean(permMap[moduleKey]?.[action]);

  // ── Toggle a single cell ────────────────────────────────────────────────
  const toggle = (moduleKey: string, action: ActionKey) => {
    if (disabled) return;
    const updated = MODULES.map((m) => {
      const cur = permMap[m.key] ?? empty(m.key);
      if (m.key !== moduleKey) return cur;
      const newVal = !cur[action];
      const next = { ...cur, [action]: newVal };
      // 'manage' on → grant all others
      if (action === 'manage' && newVal) {
        return { ...next, view: true, create: true, edit: true, delete: true, export: true };
      }
      // any action off → uncheck manage
      if (action !== 'manage' && !newVal) {
        return { ...next, manage: false };
      }
      return next;
    });
    onChange(updated);
  };

  // ── Bulk helpers ────────────────────────────────────────────────────────
  const selectAll = () =>
    onChange(MODULES.map((m) => ({ module: m.key, view: true, create: true, edit: true, delete: true, manage: true, export: true })));

  const clearAll = () =>
    onChange(MODULES.map((m) => empty(m.key)));

  const toggleColumn = (action: ActionKey) => {
    if (disabled) return;
    const allOn = MODULES.every((m) => get(m.key, action));
    onChange(MODULES.map((m) => ({ ...(permMap[m.key] ?? empty(m.key)), [action]: !allOn })));
  };

  const toggleRow = (moduleKey: string) => {
    if (disabled) return;
    const allOn = ACTIONS.every((a) => get(moduleKey, a.key));
    onChange(
      MODULES.map((m) => {
        if (m.key !== moduleKey) return permMap[m.key] ?? empty(m.key);
        return { module: m.key, view: !allOn, create: !allOn, edit: !allOn, delete: !allOn, manage: !allOn, export: !allOn };
      })
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Bulk action buttons */}
      {!disabled && (
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={selectAll}>
            <CheckSquare className="h-3.5 w-3.5" />
            Select all
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={clearAll}>
            <MinusSquare className="h-3.5 w-3.5" />
            Clear all
          </Button>
        </div>
      )}

      {/* ── Desktop table layout (md+) ───────────────────────────────── */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            {/* Module name column takes remaining space; each action column is fixed */}
            <col className="w-auto" />
            {ACTIONS.map((a) => (
              <col key={a.key} style={{ width: '72px' }} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-muted/60 border-b">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Module
              </th>
              {ACTIONS.map((action) => (
                <th key={action.key} className="py-2.5 text-center text-xs font-semibold">
                  {disabled ? (
                    <span className="text-muted-foreground uppercase tracking-wide">{action.label}</span>
                  ) : (
                    <button
                      type="button"
                      className="w-full text-center uppercase tracking-wide text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => toggleColumn(action.key)}
                      title={`Toggle all ${action.label}`}
                    >
                      {action.label}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {MODULES.map((m, idx) => {
              const rowAllOn = ACTIONS.every((a) => get(m.key, a.key));
              const rowAnyOn = ACTIONS.some((a) => get(m.key, a.key));
              return (
                <tr
                  key={m.key}
                  className={`transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'} hover:bg-muted/40`}
                >
                  <td className="px-3 py-2">
                    {disabled ? (
                      <span className="font-medium">{m.label}</span>
                    ) : (
                      <button
                        type="button"
                        className="flex items-center gap-2 text-left font-medium hover:text-primary transition-colors w-full"
                        onClick={() => toggleRow(m.key)}
                        title="Toggle entire row"
                      >
                        <span
                          className={`inline-block h-2 w-2 shrink-0 rounded-full transition-colors ${
                            rowAllOn ? 'bg-primary' : rowAnyOn ? 'bg-amber-400' : 'bg-muted-foreground/25'
                          }`}
                        />
                        {m.label}
                      </button>
                    )}
                  </td>
                  {ACTIONS.map((action) => (
                    <td key={action.key} className="py-2 text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          id={`perm-${m.key}-${action.key}`}
                          checked={get(m.key, action.key)}
                          onCheckedChange={() => toggle(m.key, action.key)}
                          disabled={disabled}
                          aria-label={`${m.label} ${action.label}`}
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile card layout (<md) ─────────────────────────────────── */}
      <div className="md:hidden space-y-2">
        {MODULES.map((m) => {
          const rowAllOn = ACTIONS.every((a) => get(m.key, a.key));
          const rowAnyOn = ACTIONS.some((a) => get(m.key, a.key));
          return (
            <div key={m.key} className="rounded-lg border bg-card p-3 space-y-2">
              {/* Module header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      rowAllOn ? 'bg-primary' : rowAnyOn ? 'bg-amber-400' : 'bg-muted-foreground/25'
                    }`}
                  />
                  <span className="text-sm font-semibold">{m.label}</span>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => toggleRow(m.key)}
                  >
                    {rowAllOn ? 'Clear all' : 'Select all'}
                  </button>
                )}
              </div>
              {/* Action checkboxes in a tight grid */}
              <div className="grid grid-cols-3 gap-x-4 gap-y-1.5">
                {ACTIONS.map((action) => (
                  <label
                    key={action.key}
                    className={`flex items-center gap-1.5 text-xs ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <Checkbox
                      id={`mperm-${m.key}-${action.key}`}
                      checked={get(m.key, action.key)}
                      onCheckedChange={() => toggle(m.key, action.key)}
                      disabled={disabled}
                      className="h-3.5 w-3.5"
                    />
                    <span className="select-none">{action.label}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hint text */}
      {!disabled && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          Click a module name to toggle the whole row. Click an action header to toggle that column.
          Enabling <strong>Manage</strong> automatically grants all other actions.
        </p>
      )}
    </div>
  );
}
