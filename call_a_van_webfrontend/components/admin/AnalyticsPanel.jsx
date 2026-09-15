'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  UserPlus,
  LogIn,
  Radio,
  LogOut,
  Eye,
  Phone,
  BadgeCheck,
  PenLine,
  Search,
  MonitorSmartphone,
  RefreshCw,
  Loader2,
} from 'lucide-react';

const EVENT_META = [
  { name: 'Become driver', icon: UserPlus, accent: 'bg-blue-50 text-[#0b51c1] border-blue-100' },
  { name: 'Login clicked', icon: LogIn, accent: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  { name: 'Go live', icon: Radio, accent: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  { name: 'End session', icon: LogOut, accent: 'bg-slate-100 text-slate-600 border-slate-200' },
  { name: 'Profile viewed', icon: Eye, accent: 'bg-sky-50 text-sky-600 border-sky-100' },
  { name: 'Call button', icon: Phone, accent: 'bg-green-50 text-green-600 border-green-100' },
  { name: 'Logged in', icon: BadgeCheck, accent: 'bg-teal-50 text-teal-600 border-teal-100' },
  { name: 'Signed up', icon: UserPlus, accent: 'bg-violet-50 text-violet-600 border-violet-100' },
  { name: 'Edit profile', icon: PenLine, accent: 'bg-amber-50 text-amber-600 border-amber-100' },
];

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function eventBadgeClass(eventName) {
  const found = EVENT_META.find((e) => e.name === eventName);
  return found?.accent || 'bg-slate-50 text-slate-600 border-slate-200';
}

export default function AnalyticsPanel({ webAnalytics, loading, onRefresh }) {
  const [query, setQuery] = useState('');
  const [eventFilter, setEventFilter] = useState('ALL');

  const counts = webAnalytics?.counts || {};
  const events = webAnalytics?.events || [];
  const totalEvents = webAnalytics?.totalEvents ?? events.length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((row) => {
      if (eventFilter !== 'ALL' && row.event !== eventFilter) return false;
      if (!q) return true;
      return (
        (row.event || '').toLowerCase().includes(q) ||
        (row.userEmail || '').toLowerCase().includes(q) ||
        (row.driverEmail || '').toLowerCase().includes(q) ||
        (row.userType || '').toLowerCase().includes(q) ||
        (row.device || '').toLowerCase().includes(q)
      );
    });
  }, [events, query, eventFilter]);

  if (loading && !webAnalytics) {
    return (
      <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-[#0b51c1]" />
        <p className="text-sm font-medium">Loading analytics…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero strip */}
      <section className="rounded-xl border border-[#0b51c1]/15 bg-gradient-to-r from-[#0b51c1] to-[#083a8c] text-white px-5 py-5 md:px-6 md:py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-blue-100 text-[11px] font-bold uppercase tracking-[0.16em]">
            <Activity className="h-3.5 w-3.5" />
            Website analytics
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold mt-1.5 tracking-tight">Website activity</h2>
          <p className="text-sm text-blue-100/90 mt-1">
            Events from the Next.js map site only · Flutter app is not included
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-center min-w-[110px]">
            <p className="text-2xl font-extrabold leading-none">{totalEvents}</p>
            <p className="text-[10px] uppercase tracking-wider text-blue-100 font-bold mt-1">Total events</p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="h-11 w-11 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center cursor-pointer disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </section>

      {/* Metric cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {EVENT_META.map((item) => {
          const Icon = item.icon;
          const value = counts[item.name] || 0;
          return (
            <button
              key={item.name}
              type="button"
              onClick={() => setEventFilter((prev) => (prev === item.name ? 'ALL' : item.name))}
              className={`text-left bg-white rounded-xl border px-4 py-4 shadow-sm transition-all cursor-pointer ${
                eventFilter === item.name
                  ? 'border-[#0b51c1] ring-2 ring-[#0b51c1]/15'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`p-2.5 rounded-lg border ${item.accent}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pt-1">
                  {eventFilter === item.name ? 'Filtered' : 'Event'}
                </span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 mt-3 tabular-nums">{value}</p>
              <p className="text-sm font-semibold text-slate-600 mt-1">{item.name}</p>
            </button>
          );
        })}
      </section>

      {/* Event log */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 md:px-5 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <MonitorSmartphone className="h-4 w-4 text-[#0b51c1]" />
              Recent events
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing {filtered.length} of {events.length} loaded
              {eventFilter !== 'ALL' ? ` · filter: ${eventFilter}` : ''}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <div className="relative flex-1 sm:min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search email, device, event…"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b51c1]/20 focus:border-[#0b51c1]"
              />
            </div>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0b51c1]/20 focus:border-[#0b51c1]"
            >
              <option value="ALL">All events</option>
              {EVENT_META.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {!filtered.length ? (
            <div className="py-16 text-center px-4">
              <Activity className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-700">No events to show</p>
              <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                {events.length
                  ? 'Try clearing the search or event filter.'
                  : 'Activity will appear here as people use the Next.js website.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left min-w-[920px]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-5">When</th>
                  <th className="py-3 px-5">Event</th>
                  <th className="py-3 px-5">User type</th>
                  <th className="py-3 px-5">User email</th>
                  <th className="py-3 px-5">Driver email</th>
                  <th className="py-3 px-5">Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3 px-5 text-slate-600 whitespace-nowrap font-medium">
                      {formatWhen(row.when)}
                    </td>
                    <td className="py-3 px-5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border ${eventBadgeClass(row.event)}`}
                      >
                        {row.event}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <span className="capitalize text-slate-700 font-semibold">
                        {row.userType || 'guest'}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-slate-600">{row.userEmail || '—'}</td>
                    <td className="py-3 px-5 text-slate-600">{row.driverEmail || '—'}</td>
                    <td className="py-3 px-5 text-slate-500 whitespace-nowrap">{row.device || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
