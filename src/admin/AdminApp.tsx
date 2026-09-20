import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, Eye, LogOut, RefreshCw, Users } from 'lucide-react';
import '../admin.css';

type Summary = {
  page_views: number;
  unique_visitors: number;
  reveals: number;
  reveal_visitors: number;
  average_matches: number | null;
};
type Daily = { day: string; page_views: number; reveals: number; unique_visitors: number };
type Breakdown = { label: string; count: number };
type Visitor = {
  visitor_id: string;
  first_seen: number;
  last_seen: number;
  page_views: number;
  reveals: number;
  ip_addresses: string | null;
  countries: string | null;
};
type Activity = {
  event_type: 'page_view' | 'reveal';
  occurred_at: number;
  visitor_id: string;
  session_id: string;
  ip_address: string | null;
  user_agent: string | null;
  referer: string | null;
  client_language: string | null;
  client_timezone: string | null;
  viewport_width: number | null;
  viewport_height: number | null;
  cf_country: string | null;
  cf_region: string | null;
  cf_city: string | null;
  cf_colo: string | null;
  cf_asn: number | null;
  cf_as_organization: string | null;
  path: string | null;
  gender: string | null;
  city: string | null;
  age_min: number | null;
  age_max: number | null;
  height_min: number | null;
  height_max: number | null;
  income_min: number | null;
  income_max: number | null;
  backgrounds_json: string | null;
  estimated_matches: number | null;
  match_share: number | null;
};
type Analytics = {
  generatedAt: string;
  days: number;
  summary: Summary;
  daily: Daily[];
  cities: Breakdown[];
  genders: Breakdown[];
  backgrounds: Breakdown[];
  visitors: Visitor[];
  activity: Activity[];
};

const number = new Intl.NumberFormat('en-AU');
const percent = new Intl.NumberFormat('en-AU', { style: 'percent', maximumFractionDigits: 1 });
const dateTime = (seconds: number) => new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(seconds * 1000));
const shortId = (id: string) => `${id.slice(0, 8)}…`;
const money = (value: number | null) => value === null ? 'Any' : `$${number.format(value)}`;
const range = (low: number | null, high: number | null, suffix = '') => low === null || high === null ? 'Any' : `${number.format(low)}–${number.format(high)}${suffix}`;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  if (!response.ok) throw new Error(response.status === 401 ? 'unauthorized' : 'request failed');
  return response.json() as Promise<T>;
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return <article className="admin-metric"><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</article>;
}

function Bars({ title, rows }: { title: string; rows: Breakdown[] }) {
  const max = Math.max(1, ...rows.map(row => row.count));
  return <section className="admin-card admin-breakdown"><h2>{title}</h2>{rows.length ? rows.map(row => <div key={row.label} className="admin-bar-row"><span>{row.label || 'Unknown'}</span><i><b style={{ width: `${row.count / max * 100}%` }} /></i><strong>{number.format(row.count)}</strong></div>) : <p className="admin-empty">No data yet.</p>}</section>;
}

function ActivityDetails({ row }: { row: Activity }) {
  let backgrounds: string[] = [];
  try { backgrounds = row.backgrounds_json ? JSON.parse(row.backgrounds_json) : []; } catch { /* Invalid historical value. */ }
  return <div className="activity-details">
    <dl>
      <div><dt>Visitor</dt><dd>{row.visitor_id}</dd></div>
      <div><dt>Session</dt><dd>{row.session_id}</dd></div>
      <div><dt>IP</dt><dd>{row.ip_address || 'Unavailable'}</dd></div>
      <div><dt>Network</dt><dd>{[row.cf_as_organization, row.cf_asn ? `AS${row.cf_asn}` : null].filter(Boolean).join(' · ') || 'Unavailable'}</dd></div>
      <div><dt>Location</dt><dd>{[row.cf_city, row.cf_region, row.cf_country, row.cf_colo && `edge ${row.cf_colo}`].filter(Boolean).join(' · ') || 'Unavailable'}</dd></div>
      <div><dt>Client</dt><dd>{[row.client_language, row.client_timezone, row.viewport_width && row.viewport_height ? `${row.viewport_width}×${row.viewport_height}` : null].filter(Boolean).join(' · ') || 'Unavailable'}</dd></div>
      <div className="wide"><dt>User agent</dt><dd>{row.user_agent || 'Unavailable'}</dd></div>
      <div className="wide"><dt>Referrer</dt><dd>{row.referer || 'Direct / unavailable'}</dd></div>
    </dl>
    {row.event_type === 'reveal' && <div className="preference-grid">
      <span><small>Interested in</small>{row.gender}</span><span><small>Dating location</small>{row.city}</span>
      <span><small>Age</small>{range(row.age_min, row.age_max)}</span><span><small>Height</small>{range(row.height_min, row.height_max, ' cm')}</span>
      <span><small>Income</small>{row.income_min === null ? 'Any' : `${money(row.income_min)}–${money(row.income_max)}`}</span>
      <span><small>Backgrounds</small>{backgrounds.length ? backgrounds.join(', ') : 'Any'}</span>
      <span><small>Estimate</small>{number.format(row.estimated_matches || 0)}</span><span><small>Population share</small>{percent.format(row.match_share || 0)}</span>
    </div>}
  </div>;
}

export default function AdminApp() {
  const [auth, setAuth] = useState<'checking' | 'signed-out' | 'signed-in'>('checking');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (rangeDays = days) => {
    setLoading(true); setError('');
    try { setData(await api<Analytics>(`/api/admin/analytics?days=${rangeDays}`)); setAuth('signed-in'); }
    catch (cause) { if ((cause as Error).message === 'unauthorized') setAuth('signed-out'); else setError('Could not load analytics.'); }
    finally { setLoading(false); }
  }, [days]);

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function login(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
      setPassword(''); setAuth('signed-in'); await load(days);
    } catch { setError('Incorrect password.'); setAuth('signed-out'); }
    finally { setLoading(false); }
  }

  async function logout() {
    await api('/api/admin/logout', { method: 'POST', body: '{}' });
    setData(null); setAuth('signed-out');
  }

  const maxDaily = useMemo(() => Math.max(1, ...(data?.daily.map(day => Math.max(day.page_views, day.reveals)) || [1])), [data]);
  if (auth === 'checking') return <main className="admin-login"><p>Checking session…</p></main>;
  if (auth === 'signed-out') return <main className="admin-login"><form onSubmit={login}><a href="/"><ArrowLeft size={14} /> SeeFish</a><p>PRIVATE ANALYTICS</p><h1>Welcome back.</h1><input className="admin-username" type="text" name="username" autoComplete="username" value="admin" readOnly aria-hidden="true" tabIndex={-1} /><label>Password<input autoFocus type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /></label>{error && <span role="alert">{error}</span>}<button disabled={loading || !password}>{loading ? 'Signing in…' : 'Open dashboard'}</button></form></main>;
  if (!data) return <main className="admin-login"><p>{error || 'Loading analytics…'}</p></main>;

  const conversion = data.summary.page_views ? data.summary.reveals / data.summary.page_views : 0;
  return <div className="admin-shell">
    <header className="admin-header"><div><a href="/"><ArrowLeft size={14} /> SeeFish</a><h1>Audience dashboard</h1><p>Private, identifiable production analytics</p></div><div className="admin-actions"><select aria-label="Analytics range" value={days} onChange={event => { const next = Number(event.target.value); setDays(next); void load(next); }}>{[7, 30, 90, 365].map(value => <option key={value} value={value}>Last {value} days</option>)}</select><button onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> Refresh</button><button onClick={() => void logout()}><LogOut size={14} /> Sign out</button></div></header>
    <main className="admin-main">
      <section className="admin-metrics">
        <Metric label="Page views" value={number.format(data.summary.page_views)} note={`${data.days}-day window`} />
        <Metric label="Unique browsers" value={number.format(data.summary.unique_visitors)} note="Persistent random IDs" />
        <Metric label="Reveal clicks" value={number.format(data.summary.reveals)} note={`${number.format(data.summary.reveal_visitors)} visitors`} />
        <Metric label="View → reveal" value={percent.format(conversion)} note="Events / page views" />
        <Metric label="Average pool" value={number.format(Math.round(data.summary.average_matches || 0))} note="Across reveal clicks" />
      </section>

      <section className="admin-card admin-daily"><div className="admin-card-title"><div><p>TRAFFIC</p><h2>Clicks per day</h2></div><div className="chart-legend"><span><i className="views" />Views</span><span><i className="reveals" />Reveals</span></div></div><div className="daily-chart">{data.daily.map(day => <div className="daily-column" key={day.day} title={`${day.day}: ${day.page_views} views, ${day.reveals} reveals`}><div className="daily-bars"><i className="views" style={{ height: `${day.page_views / maxDaily * 100}%` }} /><i className="reveals" style={{ height: `${day.reveals / maxDaily * 100}%` }} /></div><span>{day.day.slice(5)}</span></div>)}</div></section>

      <div className="admin-grid"><Bars title="Dating locations" rows={data.cities} /><Bars title="Interested in" rows={data.genders} /><Bars title="Cultural backgrounds" rows={data.backgrounds} /></div>

      <section className="admin-card admin-table-card"><div className="admin-card-title"><div><p>PEOPLE</p><h2>Browser-level visitors</h2></div><Users size={18} /></div><div className="admin-table-scroll"><table><thead><tr><th>Visitor</th><th>First seen</th><th>Last seen</th><th>Views</th><th>Reveals</th><th>IP addresses</th><th>Countries</th></tr></thead><tbody>{data.visitors.map(row => <tr key={row.visitor_id}><td title={row.visitor_id}>{shortId(row.visitor_id)}</td><td>{dateTime(row.first_seen)}</td><td>{dateTime(row.last_seen)}</td><td>{row.page_views}</td><td>{row.reveals}</td><td>{row.ip_addresses || '—'}</td><td>{row.countries || '—'}</td></tr>)}</tbody></table></div>{!data.visitors.length && <p className="admin-empty">No visitors in this period.</p>}</section>

      <section className="admin-card admin-table-card"><div className="admin-card-title"><div><p>EVENT STREAM</p><h2>Detailed activity</h2></div><Eye size={18} /></div><div className="activity-list">{data.activity.map((row, index) => <details key={`${row.event_type}-${row.occurred_at}-${row.visitor_id}-${index}`}><summary><span className={`event-badge ${row.event_type}`}>{row.event_type === 'reveal' ? 'Reveal' : 'View'}</span><time>{dateTime(row.occurred_at)}</time><code>{shortId(row.visitor_id)}</code><span>{row.ip_address || 'IP unavailable'}</span><span>{[row.cf_city, row.cf_country].filter(Boolean).join(', ') || 'Unknown location'}</span><strong>{row.event_type === 'reveal' ? `${row.gender} · ${row.city} · ${number.format(row.estimated_matches || 0)}` : row.path}</strong></summary><ActivityDetails row={row} /></details>)}</div>{!data.activity.length && <p className="admin-empty">No activity in this period.</p>}</section>
      <footer>Generated {new Date(data.generatedAt).toLocaleString('en-AU')} · Times display in your browser timezone · Raw records expire after 90 days.</footer>
    </main>
  </div>;
}
