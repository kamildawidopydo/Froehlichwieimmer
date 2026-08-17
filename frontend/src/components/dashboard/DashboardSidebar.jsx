import React, { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { BRAND_FAVICON_SRC } from '@/lib/brand';

/** IBKR Client Portal–style sidebar: compact, sans-serif, row highlight active state. */

const SectionLabel = ({ children, compact = false }) => (
  <p
    className={cn(
      'mb-0.5 font-semibold uppercase tracking-[0.08em] text-bank-text-muted/80',
      compact ? 'mt-2 px-3 text-[9px] first:mt-0' : 'mt-4 px-3 text-[10px] first:mt-2',
    )}
  >
    {children}
  </p>
);

const Badge = ({ value }) => {
  if (value == null || Number(value) <= 0) return null;
  return (
    <span className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-bank-primary px-1.5 text-[10px] font-semibold tabular-nums text-white">
      {Number(value) > 99 ? '99+' : value}
    </span>
  );
};

const itemActiveClass = (active, compact = false, nested = false) =>
  cn(
    'flex items-center gap-2 rounded-md font-medium transition-colors',
    nested
      ? 'mx-2 py-1.5 pl-9 pr-3 text-[12px]'
      : compact
        ? 'mx-2 px-2.5 py-1.5 text-[12px]'
        : 'mx-2 gap-2.5 px-3 py-2 text-[13px]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/30',
    active
      ? 'bg-bank-primary/10 text-bank-primary'
      : 'text-bank-text-muted hover:bg-bank-surface-elev/80 hover:text-bank-text',
  );

const pathMatches = (pathname, to, end) => {
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
};

const SidebarItem = ({
  to,
  end,
  icon: Icon,
  label,
  badge,
  onClick,
  forceActive,
  matchPaths,
  compact = false,
  nested = false,
}) => {
  const location = useLocation();
  const pathname = location.pathname;
  const isActive =
    forceActive ||
    (matchPaths?.length
      ? matchPaths.some((p) => pathMatches(pathname, p, false))
      : pathMatches(pathname, to, end));

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={() => itemActiveClass(isActive, compact, nested)}
    >
      {Icon && !nested ? (
        <Icon size={compact ? 14 : 16} strokeWidth={1.5} className="shrink-0 opacity-90" />
      ) : nested ? (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" aria-hidden />
      ) : (
        <span className="w-4" />
      )}
      <span className="truncate">{label}</span>
      <Badge value={badge} />
    </NavLink>
  );
};

const SidebarCollapsibleItem = ({ item, onNavigate, forceActive, compact = false }) => {
  const location = useLocation();
  const pathname = location.pathname;
  const childActive = (item.children || []).some((child) => pathMatches(pathname, child.to, false));
  const hubActive = pathMatches(pathname, item.to, item.end ?? false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  const Icon = item.icon;

  return (
    <div>
      <div className="mx-2 flex items-center gap-0.5">
        <NavLink
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={() =>
            cn(
              itemActiveClass(hubActive || forceActive, compact),
              'min-w-0 flex-1',
            )
          }
        >
          {Icon && <Icon size={compact ? 14 : 16} strokeWidth={1.5} className="shrink-0 opacity-90" />}
          <span className="truncate">{item.label}</span>
          <Badge value={item.badge} />
        </NavLink>
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? 'Untermenü einklappen' : 'Untermenü ausklappen'}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-bank-text-muted transition-colors hover:bg-bank-surface-elev/80 hover:text-bank-text',
            (hubActive || childActive) && 'text-bank-primary',
          )}
        >
          <ChevronDown size={15} className={cn('transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {(item.children || []).map((child) => (
            <SidebarItem
              key={child.to}
              to={child.to}
              icon={child.icon}
              label={child.label}
              badge={child.badge}
              end={child.end}
              onClick={onNavigate}
              compact={compact}
              nested
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SidebarGroup = ({ group, showcase, onNavigate, previewActivePath }) => (
  <div>
    {group.label && <SectionLabel compact={showcase}>{group.label}</SectionLabel>}
    <div className={cn(showcase ? 'space-y-0.5' : 'space-y-0.5')}>
      {group.items.map((item) =>
        item.collapsible && item.children?.length ? (
          <SidebarCollapsibleItem
            key={item.to}
            item={item}
            onNavigate={onNavigate}
            forceActive={previewActivePath != null && item.to === previewActivePath}
            compact={showcase}
          />
        ) : (
          <SidebarItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            badge={item.badge}
            end={item.end}
            matchPaths={item.matchPaths}
            onClick={onNavigate}
            forceActive={previewActivePath != null && item.to === previewActivePath}
            compact={showcase}
          />
        ),
      )}
    </div>
  </div>
);

const DashboardSidebar = ({
  items = [],
  onNavigate,
  brand,
  mobile = false,
  className,
  previewActivePath,
  showcase = false,
}) => (
  <aside
    className={cn(
      'flex shrink-0 flex-col bg-white dark:bg-bank-surface',
      mobile ? 'h-full w-full' : 'hidden w-[220px] border-r border-bank-border lg:flex',
      showcase && 'h-full min-h-0 overflow-hidden !flex',
      className,
    )}
  >
    <Link
      to="/"
      onClick={onNavigate}
      className="flex shrink-0 items-center gap-2.5 border-b border-bank-border px-4 py-3.5 transition-colors hover:bg-bank-bg/50"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded border border-bank-border bg-white">
        <img
          src={brand?.logo || BRAND_FAVICON_SRC}
          alt=""
          className="h-full w-full object-contain p-0.5"
          draggable={false}
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold leading-tight text-bank-text">
          {brand?.title || 'Kapitalmitte'}
        </p>
        {brand?.subtitle && (
          <p className="truncate text-[11px] text-bank-text-muted">{brand?.subtitle}</p>
        )}
      </div>
    </Link>

    <nav
      className={cn(
        'min-h-0 flex-1 py-2',
        showcase ? 'overflow-hidden no-scrollbar' : 'overflow-y-auto',
      )}
    >
      {items.map((group, gi) => (
        <SidebarGroup
          key={gi}
          group={group}
          showcase={showcase}
          onNavigate={onNavigate}
          previewActivePath={previewActivePath}
        />
      ))}
    </nav>

    <div className="mt-auto shrink-0 border-t border-bank-border p-2">
      <Link
        to="/"
        onClick={onNavigate}
        className="flex items-center gap-2 rounded-md px-3 py-2 text-[12px] text-bank-text-muted transition-colors hover:bg-bank-surface-elev/80 hover:text-bank-text"
      >
        <ExternalLink size={14} strokeWidth={1.5} className="shrink-0" />
        <span>Öffentliche Website</span>
      </Link>
    </div>
  </aside>
);

export default DashboardSidebar;
