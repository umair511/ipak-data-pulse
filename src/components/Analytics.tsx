import React, { useEffect, useState } from 'react';
import { usePlant } from '@/lib/PlantContext';
import { ANALYTICS_TABS, getMachinesForSection } from '@/lib/plantConfig';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { CHART_COLORS } from '@/lib/plantConfig';

type AnyData = Record<string, unknown>;

export default function Analytics() {
  const { selectedPlant } = usePlant();
  const [activeTab, setActiveTab] = useState('Film Line');
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<Record<string, AnyData>>({});
  const [loading, setLoading] = useState(false);

  const plantColor = selectedPlant?.color || '#16a34a';
  const plantName = selectedPlant?.name || '';

  const fetchAll = async () => {
    if (!selectedPlant) return;
    setLoading(true);
    const bp = `plant=${encodeURIComponent(plantName)}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
    const results: Record<string, AnyData> = {};
    try {
      if (activeTab === 'Film Line') {
        const [prod, dt, fw] = await Promise.all([
          fetch(`/api/analytics/production?${bp}&section=Film%20Line`).then(r => r.json()),
          fetch(`/api/analytics/downtime?${bp}&section=Film%20Line`).then(r => r.json()),
          fetch(`/api/analytics/film-wise?${bp}&section=Film%20Line`).then(r => r.json()),
        ]);
        results.production = prod;
        results.downtime = dt;
        results.filmWise = fw;
      } else if (activeTab === 'Slitter') {
        const [settings, prod, dt, fw] = await Promise.all([
          fetch(`/api/analytics/settings?${bp}`).then(r => r.json()),
          fetch(`/api/analytics/production?${bp}&section=Slitter`).then(r => r.json()),
          fetch(`/api/analytics/downtime?${bp}&section=Slitter`).then(r => r.json()),
          fetch(`/api/analytics/film-wise?${bp}&section=Slitter`).then(r => r.json()),
        ]);
        results.settings = settings;
        results.production = prod;
        results.downtime = dt;
        results.filmWise = fw;
      } else if (activeTab === 'Metallizer') {
        const [prod, cycles, dt, fw] = await Promise.all([
          fetch(`/api/analytics/production?${bp}&section=Metallizer`).then(r => r.json()),
          fetch(`/api/analytics/cycles?${bp}`).then(r => r.json()),
          fetch(`/api/analytics/downtime?${bp}&section=Metallizer`).then(r => r.json()),
          fetch(`/api/analytics/film-wise?${bp}&section=Metallizer`).then(r => r.json()),
        ]);
        results.production = prod;
        results.cycles = cycles;
        results.downtime = dt;
        results.filmWise = fw;
      } else if (activeTab === 'Targets') {
        const [target, machines] = await Promise.all([
          fetch(`/api/analytics/target?${bp}`).then(r => r.json()),
          fetch(`/api/analytics/target-machines?plant=${encodeURIComponent(plantName)}`).then(r => r.json()),
        ]);
        results.target = target;
        results.targetMachines = machines;
      }
    } catch { /* ignore */ }
    setData(results);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [selectedPlant, activeTab, dateFrom, dateTo]);

  const slitterMachines = selectedPlant
    ? getMachinesForSection(plantName, 'Slitter').map(m => m.name)
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500">{plantName} — {activeTab} section analytics</p>
        </div>
        <div className="flex gap-2 items-center">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
          <Button onClick={fetchAll} style={{ backgroundColor: plantColor }} className="text-white">Refresh</Button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2">
        {ANALYTICS_TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${activeTab === tab ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            style={activeTab === tab ? { backgroundColor: plantColor } : {}}>
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: plantColor }} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ═══════ FILM LINE ═══════ */}
          {activeTab === 'Film Line' && <FilmLineSection data={data} plantColor={plantColor} />}

          {/* ═══════ SLITTER ═══════ */}
          {activeTab === 'Slitter' && <SlitterSection data={data} plantColor={plantColor} machines={slitterMachines} />}

          {/* ═══════ METALLIZER ═══════ */}
          {activeTab === 'Metallizer' && <MetallizerSection data={data} plantColor={plantColor} />}

          {/* ═══════ TARGETS ═══════ */}
          {activeTab === 'Targets' && <TargetsSection data={data} plantColor={plantColor} />}
        </div>
      )}
    </div>
  );
}

/* ─── Shared chart wrapper ─────────────────────────────────── */
function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactElement; className?: string }) {
  return (
    <Card className={`p-4 ${className}`}>
      <h3 className="font-semibold text-sm mb-3 text-slate-700">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>{children as React.ReactElement}</ResponsiveContainer>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FILM LINE — Production, Waste, Downtime, Film-wise
   ═══════════════════════════════════════════════════════════════ */
function FilmLineSection({ data, plantColor }: { data: Record<string, AnyData>; plantColor: string }) {
  const FILM_SUB_TABS = ['Production', 'Production vs Waste', 'Waste', 'Downtime', 'Film-wise Production'] as const;
  const [subTab, setSubTab] = useState<string>(FILM_SUB_TABS[0]);

  const prod = data.production as AnyData | undefined;
  const dt = data.downtime as AnyData | undefined;
  const fw = data.filmWise as AnyData | undefined;
  const dailyProd = (prod?.daily as AnyData[]) || [];
  const monthlyProd = (prod?.monthly as AnyData[]) || [];
  const dailyDt = (dt?.daily as AnyData[]) || [];
  const monthlyDt = (dt?.monthly as AnyData[]) || [];
  const reasons = (dt?.reasons as AnyData[]) || [];
  const films = (fw?.films as AnyData[]) || [];
  const fwDaily = (fw?.daily as AnyData[]) || [];
  const filmsList = (fw?.filmsList as string[]) || [];

  return (
    <div className="space-y-4">
      <SubTabBar tabs={FILM_SUB_TABS} active={subTab} onSelect={setSubTab} color={plantColor} />

      {subTab === 'Production' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Daily Production">
              <BarChart data={dailyProd}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="production" fill={plantColor} name="Production (T)" />
              </BarChart>
            </ChartCard>
            <ChartCard title="Monthly Production">
              <BarChart data={monthlyProd}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="production" fill={plantColor} name="Production (T)" />
              </BarChart>
            </ChartCard>
          </div>
        </div>
      )}

      {subTab === 'Production vs Waste' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Daily Production vs Waste">
              <BarChart data={dailyProd}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="production" fill={plantColor} name="Production (T)" />
                <Bar dataKey="waste" fill="#ef4444" name="Waste (T)" />
              </BarChart>
            </ChartCard>
            <ChartCard title="Monthly Production vs Waste">
              <BarChart data={monthlyProd}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="production" fill={plantColor} name="Production (T)" />
                <Bar dataKey="waste" fill="#ef4444" name="Waste (T)" />
              </BarChart>
            </ChartCard>
          </div>
        </div>
      )}

      {subTab === 'Waste' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Daily Waste">
              <BarChart data={dailyProd}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="waste" fill="#ef4444" name="Waste (T)" />
              </BarChart>
            </ChartCard>
            <ChartCard title="Monthly Waste">
              <BarChart data={monthlyProd}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="waste" fill="#ef4444" name="Waste (T)" />
              </BarChart>
            </ChartCard>
          </div>
        </div>
      )}

      {subTab === 'Downtime' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Daily Downtime (Hours)">
              <BarChart data={dailyDt}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="downtimeHours" fill="#f59e0b" name="Hours" />
              </BarChart>
            </ChartCard>
            <ChartCard title="Monthly Downtime (Hours)">
              <BarChart data={monthlyDt}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="downtimeHours" fill="#f59e0b" name="Hours" />
              </BarChart>
            </ChartCard>
          </div>
          <ChartCard title="Downtime by Reason">
            <BarChart data={reasons}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="reason" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="hours" name="Hours">
                {reasons.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS.downtime[i % CHART_COLORS.downtime.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartCard>
        </div>
      )}

      {subTab === 'Film-wise Production' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Film-wise Production Total">
              <BarChart data={films}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="film" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="production" name="Production (T)">
                  {films.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS.film[i % CHART_COLORS.film.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartCard>
            <ChartCard title="Film-wise Daily Trend">
              <LineChart data={fwDaily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {filmsList.map((film, i) => (
                  <Line key={film} type="monotone" dataKey={film} stroke={CHART_COLORS.film[i % CHART_COLORS.film.length]} dot={false} />
                ))}
              </LineChart>
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SLITTER — Combined settings + per-machine settings
   ═══════════════════════════════════════════════════════════════ */
function SlitterSection({ data, plantColor, machines }: { data: Record<string, AnyData>; plantColor: string; machines: string[] }) {
  const SLITTER_SUB_TABS = ['Production', 'Film-wise Production', 'Production vs Waste', 'Waste', 'Downtime', 'Combined Settings', 'Machine-wise Settings'] as const;
  const [subTab, setSubTab] = useState<string>(SLITTER_SUB_TABS[0]);

  const s = data.settings as AnyData | undefined;
  const dailyAll = (s?.daily as AnyData[]) || [];
  const monthlyAll = (s?.monthly as AnyData[]) || [];
  const byMachine = (s?.byMachine as AnyData[]) || [];

  const prod = data.production as AnyData | undefined;
  const dt = data.downtime as AnyData | undefined;
  const fw = data.filmWise as AnyData | undefined;
  const dailyProd = (prod?.daily as AnyData[]) || [];
  const monthlyProd = (prod?.monthly as AnyData[]) || [];
  const dailyDt = (dt?.daily as AnyData[]) || [];
  const monthlyDt = (dt?.monthly as AnyData[]) || [];
  const reasons = (dt?.reasons as AnyData[]) || [];
  const films = (fw?.films as AnyData[]) || [];
  const fwDaily = (fw?.daily as AnyData[]) || [];
  const filmsList = (fw?.filmsList as string[]) || [];

  return (
    <div className="space-y-4">
      <SubTabBar tabs={SLITTER_SUB_TABS} active={subTab} onSelect={setSubTab} color={plantColor} />

      {subTab === 'Production' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Daily Production">
              <BarChart data={dailyProd}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="production" fill={plantColor} name="Production (T)" />
              </BarChart>
            </ChartCard>
            <ChartCard title="Monthly Production">
              <BarChart data={monthlyProd}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="production" fill={plantColor} name="Production (T)" />
              </BarChart>
            </ChartCard>
          </div>
        </div>
      )}

      {subTab === 'Production vs Waste' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Daily Production vs Waste">
              <BarChart data={dailyProd}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="production" fill={plantColor} name="Production (T)" />
                <Bar dataKey="waste" fill="#ef4444" name="Waste (T)" />
              </BarChart>
            </ChartCard>
            <ChartCard title="Monthly Production vs Waste">
              <BarChart data={monthlyProd}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="production" fill={plantColor} name="Production (T)" />
                <Bar dataKey="waste" fill="#ef4444" name="Waste (T)" />
              </BarChart>
            </ChartCard>
          </div>
        </div>
      )}

      {subTab === 'Waste' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Daily Waste">
              <BarChart data={dailyProd}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="waste" fill="#ef4444" name="Waste (T)" />
              </BarChart>
            </ChartCard>
            <ChartCard title="Monthly Waste">
              <BarChart data={monthlyProd}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="waste" fill="#ef4444" name="Waste (T)" />
              </BarChart>
            </ChartCard>
          </div>
        </div>
      )}

      {subTab === 'Downtime' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Daily Downtime (Hours)">
              <BarChart data={dailyDt}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="downtimeHours" fill="#f59e0b" name="Hours" />
              </BarChart>
            </ChartCard>
            <ChartCard title="Monthly Downtime (Hours)">
              <BarChart data={monthlyDt}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="downtimeHours" fill="#f59e0b" name="Hours" />
              </BarChart>
            </ChartCard>
          </div>
          <ChartCard title="Downtime by Reason">
            <BarChart data={reasons}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="reason" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="hours" name="Hours">
                {reasons.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS.downtime[i % CHART_COLORS.downtime.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartCard>
        </div>
      )}

      {subTab === 'Film-wise Production' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Film-wise Production Total">
              <BarChart data={films}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="film" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="production" name="Production (T)">
                  {films.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS.film[i % CHART_COLORS.film.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartCard>
            <ChartCard title="Film-wise Daily Trend">
              <LineChart data={fwDaily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {filmsList.map((film, i) => (
                  <Line key={film} type="monotone" dataKey={film} stroke={CHART_COLORS.film[i % CHART_COLORS.film.length]} dot={false} />
                ))}
              </LineChart>
            </ChartCard>
          </div>
        </div>
      )}

      {subTab === 'Combined Settings' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Daily Settings (All Machines Combined)">
              <BarChart data={dailyAll}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="settings" fill="#8b5cf6" name="Settings" />
              </BarChart>
            </ChartCard>
            <ChartCard title="Monthly Settings (All Machines Combined)">
              <BarChart data={monthlyAll}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="settings" fill="#8b5cf6" name="Settings" />
              </BarChart>
            </ChartCard>
          </div>
        </div>
      )}

      {subTab === 'Machine-wise Settings' && (
        <div className="space-y-4">
          {machines.map(machineName => {
            const mEntry = byMachine.find((m: AnyData) => m.machine === machineName);
            const mDaily = (mEntry?.daily as AnyData[]) || [];
            const mMonthly = mDaily.reduce((acc: AnyData[], d: AnyData) => {
              const m = String(d.date).substring(0, 7);
              const existing = acc.find(a => a.month === m);
              if (existing) { existing.settings = (existing.settings as number) + (d.settings as number); }
              else { acc.push({ month: m, settings: d.settings }); }
              return acc;
            }, []);
            return (
              <div key={machineName} className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-600">{machineName}</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ChartCard title={`${machineName} — Daily Settings`}>
                    <BarChart data={mDaily}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="settings" fill="#8b5cf6" name="Settings" />
                    </BarChart>
                  </ChartCard>
                  <ChartCard title={`${machineName} — Monthly Settings`}>
                    <BarChart data={mMonthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="settings" fill="#8b5cf6" name="Settings" />
                    </BarChart>
                  </ChartCard>
                </div>
              </div>
            );
          })}
          {machines.length === 0 && (
            <Card className="p-6 text-center text-slate-500">No slitter machines configured for this plant.</Card>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   METALLIZER — Production, Film-wise, Waste, Downtime, Cycles
   ═══════════════════════════════════════════════════════════════ */
function MetallizerSection({ data, plantColor }: { data: Record<string, AnyData>; plantColor: string }) {
  const METAL_SUB_TABS = ['Production', 'Film-wise Production', 'Production vs Waste', 'Waste', 'Downtime', 'Cycles'] as const;
  const [subTab, setSubTab] = useState<string>(METAL_SUB_TABS[0]);

  const prod = data.production as AnyData | undefined;
  const c = data.cycles as AnyData | undefined;
  const dt = data.downtime as AnyData | undefined;
  const fw = data.filmWise as AnyData | undefined;
  const dailyProd = (prod?.daily as AnyData[]) || [];
  const monthlyProd = (prod?.monthly as AnyData[]) || [];
  const dailyCycles = (c?.daily as AnyData[]) || [];
  const monthlyCycles = (c?.monthly as AnyData[]) || [];
  const dailyDt = (dt?.daily as AnyData[]) || [];
  const monthlyDt = (dt?.monthly as AnyData[]) || [];
  const reasons = (dt?.reasons as AnyData[]) || [];
  const films = (fw?.films as AnyData[]) || [];
  const fwDaily = (fw?.daily as AnyData[]) || [];
  const filmsList = (fw?.filmsList as string[]) || [];

  return (
    <div className="space-y-4">
      <SubTabBar tabs={METAL_SUB_TABS} active={subTab} onSelect={setSubTab} color={plantColor} />

      {subTab === 'Production' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Daily Production">
              <BarChart data={dailyProd}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="production" fill={plantColor} name="Production (T)" />
              </BarChart>
            </ChartCard>
            <ChartCard title="Monthly Production">
              <BarChart data={monthlyProd}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="production" fill={plantColor} name="Production (T)" />
              </BarChart>
            </ChartCard>
          </div>
        </div>
      )}

      {subTab === 'Production vs Waste' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Daily Production vs Waste">
              <BarChart data={dailyProd}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="production" fill={plantColor} name="Production (T)" />
                <Bar dataKey="waste" fill="#ef4444" name="Waste (T)" />
              </BarChart>
            </ChartCard>
            <ChartCard title="Monthly Production vs Waste">
              <BarChart data={monthlyProd}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="production" fill={plantColor} name="Production (T)" />
                <Bar dataKey="waste" fill="#ef4444" name="Waste (T)" />
              </BarChart>
            </ChartCard>
          </div>
        </div>
      )}

      {subTab === 'Waste' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Daily Waste">
              <BarChart data={dailyProd}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="waste" fill="#ef4444" name="Waste (T)" />
              </BarChart>
            </ChartCard>
            <ChartCard title="Monthly Waste">
              <BarChart data={monthlyProd}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="waste" fill="#ef4444" name="Waste (T)" />
              </BarChart>
            </ChartCard>
          </div>
        </div>
      )}

      {subTab === 'Downtime' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Daily Downtime (Hours)">
              <BarChart data={dailyDt}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="downtimeHours" fill="#f59e0b" name="Hours" />
              </BarChart>
            </ChartCard>
            <ChartCard title="Monthly Downtime (Hours)">
              <BarChart data={monthlyDt}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="downtimeHours" fill="#f59e0b" name="Hours" />
              </BarChart>
            </ChartCard>
          </div>
          <ChartCard title="Downtime by Reason">
            <BarChart data={reasons}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="reason" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="hours" name="Hours">
                {reasons.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS.downtime[i % CHART_COLORS.downtime.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartCard>
        </div>
      )}

      {subTab === 'Film-wise Production' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Film-wise Production Total">
              <BarChart data={films}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="film" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="production" name="Production (T)">
                  {films.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS.film[i % CHART_COLORS.film.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartCard>
            <ChartCard title="Film-wise Daily Trend">
              <LineChart data={fwDaily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {filmsList.map((film, i) => (
                  <Line key={film} type="monotone" dataKey={film} stroke={CHART_COLORS.film[i % CHART_COLORS.film.length]} dot={false} />
                ))}
              </LineChart>
            </ChartCard>
          </div>
        </div>
      )}

      {subTab === 'Cycles' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Daily Cycles">
              <BarChart data={dailyCycles}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="cycles" fill="#0ea5e9" name="Cycles" />
              </BarChart>
            </ChartCard>
            <ChartCard title="Monthly Cycles">
              <BarChart data={monthlyCycles}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="cycles" fill="#0ea5e9" name="Cycles" />
              </BarChart>
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TARGETS — Target vs Actual Production
   ═══════════════════════════════════════════════════════════════ */
function TargetsSection({ data, plantColor }: { data: Record<string, AnyData>; plantColor: string }) {
  const t = data.target as AnyData | undefined;
  const targetMachines = ((data.targetMachines as AnyData)?.machines as string[]) || [];
  const enriched = (t?.targets as AnyData[]) || [];

  const [selectedMachine, setSelectedMachine] = useState(targetMachines[0] || '');
  const [viewMode, setViewMode] = useState<'daily' | 'shift-wise'>('daily');

  useEffect(() => {
    if (targetMachines.length > 0 && !targetMachines.includes(selectedMachine)) {
      setSelectedMachine(targetMachines[0]);
    }
  }, [targetMachines]);

  const filtered = enriched.filter((r: AnyData) => r.machineName === selectedMachine);

  let chartData: AnyData[] = [];
  let chartKey = '';

  if (viewMode === 'daily') {
    const dayMap = new Map<string, { target: number; actual: number }>();
    filtered.forEach((r: AnyData) => {
      const cur = dayMap.get(r.targetDate as string) || { target: 0, actual: 0 };
      cur.target += r.dailyTargetTons as number;
      cur.actual += r.actual as number;
      dayMap.set(r.targetDate as string, cur);
    });
    chartData = Array.from(dayMap.entries())
      .map(([date, v]) => ({ date, target: v.target, actual: v.actual, achievement: v.target > 0 ? (v.actual / v.target * 100) : 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));
    chartKey = 'date';
  } else {
    const shiftMap = new Map<string, { target: number; actual: number }>();
    filtered.forEach((r: AnyData) => {
      const key = `${r.shift}`;
      const cur = shiftMap.get(key) || { target: 0, actual: 0 };
      cur.target += r.dailyTargetTons as number;
      cur.actual += r.actual as number;
      shiftMap.set(key, cur);
    });
    chartData = Array.from(shiftMap.entries())
      .map(([shift, v]) => ({ shift, target: v.target, actual: v.actual, achievement: v.target > 0 ? (v.actual / v.target * 100) : 0 }));
    chartKey = 'shift';
  }

  const totalTarget = chartData.reduce((s: number, d: AnyData) => s + ((d.target as number) || 0), 0);
  const totalActual = chartData.reduce((s: number, d: AnyData) => s + ((d.actual as number) || 0), 0);
  const overallPct = totalTarget > 0 ? (totalActual / totalTarget * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {targetMachines.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Machine:</label>
            <select
              value={selectedMachine}
              onChange={e => setSelectedMachine(e.target.value)}
              className="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white"
            >
              {targetMachines.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}
        <div className="flex border border-slate-300 rounded-md overflow-hidden text-sm">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-3 py-1.5 transition-colors ${viewMode === 'daily' ? 'text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            style={viewMode === 'daily' ? { backgroundColor: plantColor } : {}}
          >Daily</button>
          <button
            onClick={() => setViewMode('shift-wise')}
            className={`px-3 py-1.5 transition-colors ${viewMode === 'shift-wise' ? 'text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            style={viewMode === 'shift-wise' ? { backgroundColor: plantColor } : {}}
          >Shift-wise</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500">Total Target</p>
          <p className="text-xl font-bold" style={{ color: plantColor }}>{totalTarget.toFixed(1)}</p>
          <p className="text-xs text-slate-400">Tons</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500">Total Actual</p>
          <p className="text-xl font-bold text-blue-600">{totalActual.toFixed(1)}</p>
          <p className="text-xs text-slate-400">Tons</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500">Achievement</p>
          <p className={`text-xl font-bold ${overallPct >= 100 ? 'text-green-600' : 'text-orange-500'}`}>{overallPct.toFixed(1)}%</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500">Gap</p>
          <p className={`text-xl font-bold ${totalActual >= totalTarget ? 'text-green-600' : 'text-red-500'}`}>
            {totalActual >= totalTarget ? '+' : ''}{(totalActual - totalTarget).toFixed(1)}
          </p>
          <p className="text-xs text-slate-400">Tons</p>
        </div>
      </div>

      <SectionHeader label={`${selectedMachine} — ${viewMode === 'daily' ? 'Daily' : 'Shift-wise'} Target vs Actual`} color={plantColor} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title={`Target vs Actual (${viewMode === 'daily' ? 'Daily' : 'Shift-wise'})`}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chartKey} tick={{ fontSize: 10 }} angle={viewMode === 'daily' ? -30 : 0} textAnchor="end" height={viewMode === 'daily' ? 60 : 30} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(val: number) => `${val.toFixed(1)} T`} />
            <Legend />
            <Bar dataKey="target" fill={plantColor} name="Target (T)" opacity={0.4} />
            <Bar dataKey="actual" fill={plantColor} name="Actual (T)" />
          </BarChart>
        </ChartCard>
        <ChartCard title={`Achievement % (${viewMode === 'daily' ? 'Daily' : 'Shift-wise'})`}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chartKey} tick={{ fontSize: 10 }} angle={viewMode === 'daily' ? -30 : 0} textAnchor="end" height={viewMode === 'daily' ? 60 : 30} />
            <YAxis tick={{ fontSize: 11 }} unit="%" />
            <Tooltip formatter={(val: number) => `${val.toFixed(1)}%`} />
            <Bar dataKey="achievement" name="Achievement %">
              {chartData.map((entry: AnyData, i: number) => (
                <Cell key={i} fill={(entry.achievement as number) >= 100 ? '#16a34a' : '#f59e0b'} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>
      </div>

      {/* Trend line (only for daily mode) */}
      {viewMode === 'daily' && chartData.length > 1 && (
        <ChartCard title="Trend — Target vs Actual" className="!h-auto">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(val: number) => `${val.toFixed(1)} T`} />
            <Legend />
            <Line type="monotone" dataKey="target" stroke={plantColor} strokeDasharray="5 5" name="Target (T)" />
            <Line type="monotone" dataKey="actual" stroke="#2563eb" strokeWidth={2} name="Actual (T)" />
          </LineChart>
        </ChartCard>
      )}
    </div>
  );
}

/* ─── Sub-tab bar (used inside each section) ───────────────── */
function SubTabBar({ tabs, active, onSelect, color }: { tabs: readonly string[]; active: string; onSelect: (t: string) => void; color: string }) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 border-b border-slate-200">
      {tabs.map(tab => (
        <button
          key={tab}
          onClick={() => onSelect(tab)}
          className={`px-3 py-1.5 text-xs font-medium rounded-t-lg whitespace-nowrap transition-colors ${active === tab ? 'text-white border-b-2' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
          style={active === tab ? { backgroundColor: color } : {}}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

/* ─── Section header helper ────────────────────────────────── */
function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      <h2 className="text-lg font-semibold text-slate-800">{label}</h2>
    </div>
  );
}
