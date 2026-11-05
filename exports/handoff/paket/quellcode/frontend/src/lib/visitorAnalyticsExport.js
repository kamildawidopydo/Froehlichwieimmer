const csvEscape = (v) => {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const downloadCsv = (filename, rows) => {
  const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export function exportActiveSessionsCsv(sessions) {
  const header = [
    'Session-ID', 'Name', 'E-Mail', 'Aktuelle Seite', 'Scroll %', 'Seiten',
    'Gerät', 'Browser', 'Land', 'Stadt', 'Referrer', 'UTM Source', 'UTM Medium', 'UTM Campaign',
    'Gestartet', 'Zuletzt aktiv', 'Ghost',
  ];
  const rows = [header.map(csvEscape).join(',')];
  (sessions || []).forEach((s) => {
    const name = s.user_id
      ? [s.first_name, s.last_name].filter(Boolean).join(' ') || s.email || 'User'
      : 'Anonym';
    rows.push([
      s.id, name, s.email || '', s.current_path || '', s.scroll_depth ?? 0, s.page_views ?? 0,
      s.device_type || '', s.browser || '', s.country || '', s.city || '',
      s.referrer || '', s.utm_source || '', s.utm_medium || '', s.utm_campaign || '',
      s.started_at || '', s.last_seen_at || '', s.is_ghost ? 'ja' : 'nein',
    ].map(csvEscape).join(','));
  });
  downloadCsv(`aktive-besucher-${new Date().toISOString().slice(0, 10)}.csv`, rows);
}

export function exportEventsCsv(events) {
  const header = ['Zeit', 'Typ', 'Seite', 'Session-ID', 'Details'];
  const rows = [header.map(csvEscape).join(',')];
  (events || []).forEach((e) => {
    const payload = e.event_payload || {};
    let detail = JSON.stringify(payload);
    if (e.event_type === 'conversion') detail = payload.goal || '';
    else if (e.event_type === 'page_view') detail = payload.title || payload.path || '';
    rows.push([
      e.created_at || '', e.event_type || '', e.page_path || '', e.session_id || '', detail,
    ].map(csvEscape).join(','));
  });
  downloadCsv(`live-events-${new Date().toISOString().slice(0, 10)}.csv`, rows);
}

export function exportOverviewCsv(data) {
  const y = data.yesterdayComparison || {};
  const pct = (today, yesterday) => {
    if (!yesterday) return today > 0 ? '+100%' : '0%';
    const d = ((today - yesterday) / yesterday) * 100;
    return `${d >= 0 ? '+' : ''}${d.toFixed(1)}%`;
  };
  const rows = [
    ['Metrik', 'Heute', 'Gestern', 'Delta'].map(csvEscape).join(','),
    ['Sessions', data.todaySessions, y.sessions, pct(data.todaySessions, y.sessions)].map(csvEscape).join(','),
    ['Seitenaufrufe', data.todayPageViews, y.pageViews, pct(data.todayPageViews, y.pageViews)].map(csvEscape).join(','),
    ['Unique Besucher', data.todayUniqueVisitors, y.uniqueVisitors, pct(data.todayUniqueVisitors, y.uniqueVisitors)].map(csvEscape).join(','),
    ['Conversions', data.conversionsToday, y.conversions, pct(data.conversionsToday, y.conversions)].map(csvEscape).join(','),
    ['Ø Verweildauer (s)', data.avgDurationToday, y.avgDuration, ''].map(csvEscape).join(','),
    ['Absprungrate (%)', data.bounceRateToday, y.bounceRate, ''].map(csvEscape).join(','),
    ['Live jetzt', data.liveNow, '', ''].map(csvEscape).join(','),
    ['Rage-Klicks', data.rageClicksToday, '', ''].map(csvEscape).join(','),
    ['JS-Fehler', data.jsErrorsToday, '', ''].map(csvEscape).join(','),
  ];
  downloadCsv(`besucher-uebersicht-${new Date().toISOString().slice(0, 10)}.csv`, rows);
}
