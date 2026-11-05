import React, { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ShortcutRow = ({ keys, desc }) => (
  <div className="flex items-center justify-between gap-4 py-2 text-[13px]">
    <span className="text-bank-text-muted">{desc}</span>
    <kbd className="shrink-0 rounded border border-bank-border bg-bank-bg px-2 py-0.5 font-mono text-[11px] text-bank-text">
      {keys}
    </kbd>
  </div>
);

const KeyboardShortcutsDialog = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const isApple = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const mod = isApple ? '⌘' : 'Ctrl';

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = e.target?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
        e.preventDefault();
        onOpenChange((v) => !v);
      }
      if (e.key === 'Escape' && open) onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(8,30,56,0.55)' }}
      onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
    >
      <div className="relative w-full max-w-md rounded-xl border border-bank-border bg-white p-6 shadow-xl">
        <button
          type="button"
          className="absolute right-3 top-3 rounded-md p-1.5 text-bank-text-muted hover:bg-bank-bg"
          onClick={() => onOpenChange(false)}
          aria-label={t('common.close', { defaultValue: 'Schließen' })}
        >
          <X size={16} />
        </button>
        <div className="mb-4 flex items-center gap-2">
          <Keyboard size={18} className="text-bank-primary" />
          <h2 id="shortcuts-title" className="text-lg font-semibold text-bank-text">
            {t('dashboardShell.shortcuts.title', { defaultValue: 'Tastenkürzel' })}
          </h2>
        </div>
        <div className="divide-y divide-bank-border/70">
          <ShortcutRow
            keys={`${mod} K`}
            desc={t('dashboardShell.shortcuts.search', { defaultValue: 'Suche / Command Palette' })}
          />
          <ShortcutRow
            keys="?"
            desc={t('dashboardShell.shortcuts.help', { defaultValue: 'Diese Übersicht' })}
          />
          <ShortcutRow
            keys="Esc"
            desc={t('dashboardShell.shortcuts.close', { defaultValue: 'Dialog schließen' })}
          />
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsDialog;
