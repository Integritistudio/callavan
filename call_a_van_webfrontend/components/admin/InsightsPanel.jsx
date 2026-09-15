'use client';

import {
  Users,
  UserCheck,
  Clock,
  MapPinOff,
  Radio,
  PieChart,
  Layers,
  Gauge,
} from 'lucide-react';

function pctBar(percent, colorClass) {
  const width = Math.max(0, Math.min(100, percent || 0));
  return (
    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function Donut({ approved, notApproved }) {
  const total = approved + notApproved || 1;
  const approvedDeg = (approved / total) * 360;
  return (
    <div className="flex items-center gap-5">
      <div
        className="w-28 h-28 rounded-full shrink-0 shadow-inner"
        style={{
          background: `conic-gradient(#22c55e 0deg ${approvedDeg}deg, #f59e0b ${approvedDeg}deg 360deg)`,
        }}
      >
        <div className="w-full h-full rounded-full flex items-center justify-center p-5">
          <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center">
            <span className="text-lg font-extrabold text-slate-800">{approved + notApproved}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total</span>
          </div>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-slate-600">Approved</span>
          <span className="font-bold text-slate-800 ml-auto pl-4">{approved}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-slate-600">Pending</span>
          <span className="font-bold text-slate-800 ml-auto pl-4">{notApproved}</span>
        </div>
      </div>
    </div>
  );
}

function AvailabilityBars({ live, offline, approved }) {
  const total = approved || live + offline || 1;
  const livePct = Math.round((live / total) * 100);
  const offlinePct = Math.round((offline / total) * 100);
  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-sm mb-1.5">
          <span className="font-semibold text-slate-700">Live now</span>
          <span className="font-bold text-emerald-600">
            {live} ({livePct}%)
          </span>
        </div>
        {pctBar(livePct, 'bg-emerald-500')}
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1.5">
          <span className="font-semibold text-slate-700">Offline</span>
          <span className="font-bold text-slate-500">
            {offline} ({offlinePct}%)
          </span>
        </div>
        {pctBar(offlinePct, 'bg-slate-400')}
      </div>
      <p className="text-xs text-slate-400">Based on {approved} approved drivers</p>
    </div>
  );
}

export default function InsightsPanel({ insights, loading }) {
  if (loading || !insights) {
    return (
      <div className="py-16 text-center text-slate-400 text-sm font-medium">
        Loading insights…
      </div>
    );
  }

  const {
    totalDrivers,
    approvedDrivers,
    pendingReview,
    missingLocations,
    liveAvailability,
    statusDistribution,
    topServices,
    driverReadiness,
  } = insights;

  const maxService = Math.max(...(topServices?.map((s) => s.count) || [1]), 1);

  const summaryCards = [
    { label: 'Total drivers', value: totalDrivers, icon: Users, tone: 'bg-blue-50 text-[#0b51c1]' },
    { label: 'Approved', value: approvedDrivers, icon: UserCheck, tone: 'bg-green-50 text-green-600' },
    { label: 'Pending review', value: pendingReview, icon: Clock, tone: 'bg-amber-50 text-amber-600' },
    { label: 'Missing locations', value: missingLocations, icon: MapPinOff, tone: 'bg-rose-50 text-rose-600' },
  ];

  const readinessRows = [
    { label: 'Approved drivers', ...driverReadiness.approvedDrivers, color: 'bg-[#0b51c1]' },
    { label: 'Pending review', ...driverReadiness.pendingReview, color: 'bg-amber-500' },
    { label: 'Missing locations', ...driverReadiness.missingLocations, color: 'bg-rose-500' },
    { label: 'Approved online', ...driverReadiness.approvedOnline, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm"
            >
              <div className={`p-3 rounded-lg ${card.tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{card.label}</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{card.value}</p>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-5">
            <Radio className="h-4 w-4 text-[#0b51c1]" />
            Live availability
          </h3>
          <AvailabilityBars
            live={liveAvailability.live}
            offline={liveAvailability.offline}
            approved={liveAvailability.approved}
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-5">
            <PieChart className="h-4 w-4 text-[#0b51c1]" />
            Status distribution
          </h3>
          <Donut
            approved={statusDistribution.approved}
            notApproved={statusDistribution.notApproved}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-5">
            <Layers className="h-4 w-4 text-[#0b51c1]" />
            Top services
          </h3>
          {!topServices?.length ? (
            <p className="text-sm text-slate-400">No services recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {topServices.map((service) => {
                const width = Math.round((service.count / maxService) * 100);
                return (
                  <div key={service.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold text-slate-700 truncate pr-3">{service.name}</span>
                      <span className="font-bold text-slate-500 shrink-0">{service.count}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#0b51c1]"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-5">
            <Gauge className="h-4 w-4 text-[#0b51c1]" />
            Driver readiness
          </h3>
          <div className="space-y-4">
            {readinessRows.map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-semibold text-slate-700">{row.label}</span>
                  <span className="font-bold text-slate-800">
                    {row.count}{' '}
                    <span className="text-slate-400 font-semibold">({row.percent}%)</span>
                  </span>
                </div>
                {pctBar(row.percent, row.color)}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
