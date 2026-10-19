import {
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  ListTodo,
  Star,
  Rss,
  UserCircle,
  Headphones,
  Bell,
  Receipt,
  FileText,
} from 'lucide-react';
import { PRODUCT_ICONS } from '@/lib/productIcons';

import { VERMOEGEN_HUB_PATH } from '@/components/dashboard/VermoegenBreadcrumb';

const tr = (t, key, defaultValue) =>
  t ? t(key, { defaultValue }) : defaultValue;

/** Product sub-pages under the Vermögen hub. */
export const VERMOEGEN_PRODUCT_PATHS = [
  '/dashboard/festgeld',
  '/dashboard/tagesgeld',
  '/dashboard/flexgeld',
  '/dashboard/anleihen',
  '/dashboard/anleihen/kaufen',
  '/dashboard/aktien',
  '/dashboard/ipo',
];

export const VERMOEGEN_MATCH_PATHS = [VERMOEGEN_HUB_PATH, '/dashboard/depot', ...VERMOEGEN_PRODUCT_PATHS];

export function isVermoegenRoute(pathname = '') {
  return VERMOEGEN_MATCH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Shared sidebar navigation for the user dashboard and login-page tablet mockup.
 */
export function createUserDashboardNavItems({
  t,
  pendingOrdersCount = 0,
  pendingBondRequests = 0,
  pendingIpoRequests = 0,
  supportUnread = 0,
} = {}) {
  const ordersBadge = pendingOrdersCount + pendingBondRequests + pendingIpoRequests;

  return [
    {
      label: tr(t, 'shell.user.overview', 'Übersicht'),
      items: [
        {
          to: '/dashboard/uebersicht',
          label: tr(t, 'shell.user.overview', 'Übersicht'),
          icon: LayoutDashboard,
          end: true,
        },
      ],
    },
    {
      label: tr(t, 'shell.user.wealth', 'Vermögen'),
      items: [
        {
          to: VERMOEGEN_HUB_PATH,
          label: tr(t, 'shell.user.wealthHub', 'Mein Vermögen'),
          icon: Briefcase,
          end: true,
          collapsible: true,
          autoExpandPaths: VERMOEGEN_MATCH_PATHS,
          children: [
            {
              to: '/dashboard/festgeld',
              label: tr(t, 'shell.user.fixedDeposit', 'Festgeld'),
              icon: PRODUCT_ICONS.festgeld,
            },
            {
              to: '/dashboard/tagesgeld',
              label: tr(t, 'shell.user.dailyDeposit', 'Tagesgeld'),
              icon: PRODUCT_ICONS.tagesgeld,
            },
            {
              to: '/dashboard/flexgeld',
              label: tr(t, 'shell.user.flexDeposit', 'Flexgeld'),
              icon: PRODUCT_ICONS.flexgeld,
            },
            {
              to: '/dashboard/anleihen',
              label: tr(t, 'shell.user.bonds', 'Anleihen'),
              icon: PRODUCT_ICONS.anleihen,
            },
            {
              to: '/dashboard/aktien',
              label: tr(t, 'shell.user.stocks', 'Aktien'),
              icon: PRODUCT_ICONS.aktien,
            },
            {
              to: '/dashboard/ipo',
              label: tr(t, 'shell.user.ipo', 'IPO'),
              icon: PRODUCT_ICONS.ipo,
            },
          ],
        },
        {
          to: '/dashboard/handeln',
          label: tr(t, 'shell.user.market', 'Handeln'),
          icon: TrendingUp,
        },
      ],
    },
    {
      label: tr(t, 'shell.user.activity', 'Aktivität'),
      items: [
        {
          to: '/dashboard/auftraege',
          label: tr(t, 'shell.user.orders', 'Aufträge'),
          icon: ListTodo,
          badge: ordersBadge || undefined,
        },
        {
          to: '/dashboard/alarme',
          label: tr(t, 'shell.user.alerts', 'Kursalarme'),
          icon: Bell,
        },
        { to: '/dashboard/favoriten', label: tr(t, 'shell.user.favorites', 'Favoriten'), icon: Star },
        { to: '/dashboard/news', label: tr(t, 'shell.user.news', 'Nachrichten'), icon: Rss },
      ],
    },
    {
      label: tr(t, 'shell.user.account', 'Konto'),
      items: [
        {
          to: '/dashboard/kontoauszug',
          label: tr(t, 'shell.user.statement', 'Kontoauszug'),
          icon: Receipt,
        },
        {
          to: '/dashboard/dokumente',
          label: tr(t, 'shell.user.documents', 'Dokumente'),
          icon: FileText,
        },
        { to: '/dashboard/profil', label: tr(t, 'shell.user.profile', 'Profil'), icon: UserCircle },
        {
          to: '/dashboard/support',
          label: tr(t, 'shell.user.support', 'Support'),
          icon: Headphones,
          badge: supportUnread || undefined,
        },
      ],
    },
  ];
}

/** Static badges for the login-page tablet preview. */
export const SHOWCASE_NAV_BADGES = {
  pendingOrdersCount: 2,
  pendingBondRequests: 0,
  supportUnread: 0,
};
