import React, { useEffect, useState } from 'react';
import { usePlant } from '@/lib/PlantContext';
import { useAuth } from '@/lib/AuthContext';
import { canAccessDashboardSection } from '@/lib/permissions';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Clock, Settings, Zap, ArrowRight, Truck, Globe, MapPin } from 'lucide-react';

interface KpiData {
  production: number;
  waste: number;
  wastePercent: number;
  downtimeHours: number;
  settings: number;
  cycles: number;
}

interface SectionKpi {
  section: string;
  production: number;
  waste: number;
  wastePercent: number;
  downtimeHours: number;
  settings: number;
  cycles: number;
}

function getMonthRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    dateFrom: first.toISOString().split('T')[0],
    dateTo: now.toISOString().split('T')[0],
  };
}

function getYesterdayRange() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const s = d.toISOString().split('T')[0];
  return { dateFrom: s, dateTo: s };
}

function KpiCard({
  label, value, unit, icon: Icon, color, onClick,
}: {
  label: string; value: string; unit: string;
  icon: any; color: string; onClick?: () => void;
}) {
  return (
    <Card
      className={`p-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
          <p className="text-xs text-slate-400 mt-0.5">{unit}</p>
        </div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '15' }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      {onClick && <ArrowRight className="w-4 h-4 text-slate-300 mt-2" />}
    </Card>
  );
}

interface DispatchKpis {
  total: number; exportTons: number; localTons: number;
}

export default function Dashboard({ onNavigate }: { onNavigate: (path: string, params?: Record<string, string>) => void }) {
  const { selectedPlant } = usePlant();
  const { permissions } = useAuth();
  const [monthData, setMonthData] = useState<SectionKpi[]>([]);
  const [yesterdayData, setYesterdayData] = useState<SectionKpi[]>([]);
  const [dispatchMonth, setDispatchMonth] = useState<DispatchKpis>({ total: 0, exportTons: 0, localTons: 0 });
  const [dispatchYesterday, setDispatchYesterday] = useState<DispatchKpis>({ total: 0, exportTons: 0, localTons: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedPlant) return;
    setLoading(true);
    const month = getMonthRange();
    const yesterday = getYesterdayRange();
    const plant = selectedPlant.name;

    Promise.all([
      fetch(`/api/dashboard/kpis?plant=${plant}&dateFrom=${month.dateFrom}&dateTo=${month.dateTo}`).then(r => r.json()),
      fetch(`/api/dashboard/kpis?plant=${plant}&dateFrom=${yesterday.dateFrom}&dateTo=${yesterday.dateTo}`).then(r => r.json()),
      fetch(`/api/dashboard/dispatch-kpis?plant=${plant}&monthDateFrom=${month.dateFrom}&monthDateTo=${month.dateTo}&yesterdayDate=${yesterday.dateFrom}`).then(r => r.json()),
    ]).then(([m, y, dk]) => {
      setMonthData(m.sections || []);
      setYesterdayData(y.sections || []);
      setDispatchMonth(dk.month || { total: 0, exportTons: 0, localTons: 0 });
      setDispatchYesterday(dk.yesterday || { total: 0, exportTons: 0, localTons: 0 });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedPlant]);

  const plantColor = selectedPlant?.color || '#16a34a';

  if (!selectedPlant) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Please select a plant first.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: plantColor }} />
      </div>
    );
  }

  const allSections = ['Film Line', 'Slitter', 'Metallizer'];
  const sections = allSections.filter(s => canAccessDashboardSection(permissions, s));
  const showDispatch = canAccessDashboardSection(permissions, 'Dispatch');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm">{selectedPlant.name} — Production Overview</p>
      </div>

      {sections.length === 0 && !showDispatch && (
        <Card className="p-8 text-center">
          <p className="text-slate-500">No dashboard sections available for your permissions.</p>
        </Card>
      )}

      {sections.map(section => {
        const monthSec = monthData.find(s => s.section === section) || { production: 0, waste: 0, wastePercent: 0, downtimeHours: 0, settings: 0, cycles: 0 };
        const yestSec = yesterdayData.find(s => s.section === section) || { production: 0, waste: 0, wastePercent: 0, downtimeHours: 0, settings: 0, cycles: 0 };

        return (
          <div key={section} className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: plantColor }} />
              {section}
            </h2>

            {/* This Month */}
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">This Month</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard
                  label="Production" value={monthSec.production.toFixed(1)} unit="Tons"
                  icon={TrendingUp} color={plantColor}
                  onClick={() => onNavigate('/reports', { reportType: 'Overall Production', section, dateFrom: getMonthRange().dateFrom, dateTo: getMonthRange().dateTo })}
                />
                <KpiCard
                  label="Waste" value={`${monthSec.wastePercent.toFixed(1)}%`} unit={`${monthSec.waste.toFixed(1)} Tons`}
                  icon={TrendingDown} color="#ef4444"
                  onClick={() => onNavigate('/reports', { reportType: 'Waste', section, dateFrom: getMonthRange().dateFrom, dateTo: getMonthRange().dateTo })}
                />
                <KpiCard
                  label="Downtime" value={monthSec.downtimeHours.toFixed(1)} unit="Hours"
                  icon={Clock} color="#f59e0b"
                  onClick={() => onNavigate('/reports', { reportType: 'Downtime', section, dateFrom: getMonthRange().dateFrom, dateTo: getMonthRange().dateTo })}
                />
                {section === 'Slitter' && (
                  <KpiCard
                    label="Settings" value={String(monthSec.settings)} unit="Total Settings"
                    icon={Settings} color="#8b5cf6"
                    onClick={() => onNavigate('/reports', { reportType: 'Settings', section, dateFrom: getMonthRange().dateFrom, dateTo: getMonthRange().dateTo })}
                  />
                )}
                {section === 'Metallizer' && (
                  <KpiCard
                    label="Cycles" value={String(monthSec.cycles)} unit="Total Cycles"
                    icon={Zap} color="#0ea5e9"
                    onClick={() => onNavigate('/reports', { reportType: 'Cycles', section, dateFrom: getMonthRange().dateFrom, dateTo: getMonthRange().dateTo })}
                  />
                )}
              </div>
            </div>

            {/* Yesterday */}
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Yesterday</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard
                  label="Production" value={yestSec.production.toFixed(1)} unit="Tons"
                  icon={TrendingUp} color={plantColor}
                  onClick={() => onNavigate('/reports', { reportType: 'Overall Production', section, dateFrom: getYesterdayRange().dateFrom, dateTo: getYesterdayRange().dateTo })}
                />
                <KpiCard
                  label="Waste" value={`${yestSec.wastePercent.toFixed(1)}%`} unit={`${yestSec.waste.toFixed(1)} Tons`}
                  icon={TrendingDown} color="#ef4444"
                  onClick={() => onNavigate('/reports', { reportType: 'Waste', section, dateFrom: getYesterdayRange().dateFrom, dateTo: getYesterdayRange().dateTo })}
                />
                <KpiCard
                  label="Downtime" value={yestSec.downtimeHours.toFixed(1)} unit="Hours"
                  icon={Clock} color="#f59e0b"
                  onClick={() => onNavigate('/reports', { reportType: 'Downtime', section, dateFrom: getYesterdayRange().dateFrom, dateTo: getYesterdayRange().dateTo })}
                />
                {section === 'Slitter' && (
                  <KpiCard
                    label="Settings" value={String(yestSec.settings)} unit="Settings"
                    icon={Settings} color="#8b5cf6"
                  />
                )}
                {section === 'Metallizer' && (
                  <KpiCard
                    label="Cycles" value={String(yestSec.cycles)} unit="Cycles"
                    icon={Zap} color="#0ea5e9"
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
      {/* ─── Dispatch Section ─────────────────────────────────── */}
      {showDispatch && (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#0ea5e9' }} />
          Dispatch
        </h2>

        {/* This Month */}
        <div>
          <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">This Month</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KpiCard
              label="This Month Dispatch (Tons)" value={dispatchMonth.total.toFixed(1)} unit="Tons (Export + Local)"
              icon={Truck} color="#0ea5e9"
              onClick={() => onNavigate('/dispatch-report', { dateFrom: getMonthRange().dateFrom, dateTo: getMonthRange().dateTo, dispatchType: '' })}
            />
            <KpiCard
              label="Export Customer Dispatch" value={dispatchMonth.exportTons.toFixed(1)} unit="Tons (Export)"
              icon={Globe} color="#16a34a"
              onClick={() => onNavigate('/dispatch-report', { dateFrom: getMonthRange().dateFrom, dateTo: getMonthRange().dateTo, dispatchType: 'Export' })}
            />
            <KpiCard
              label="Local Customer Dispatch" value={dispatchMonth.localTons.toFixed(1)} unit="Tons (Local)"
              icon={MapPin} color="#f59e0b"
              onClick={() => onNavigate('/dispatch-report', { dateFrom: getMonthRange().dateFrom, dateTo: getMonthRange().dateTo, dispatchType: 'Local' })}
            />
          </div>
        </div>

        {/* Yesterday */}
        <div>
          <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Yesterday</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KpiCard
              label="Yesterday Dispatch (Tons)" value={dispatchYesterday.total.toFixed(1)} unit="Tons (Export + Local)"
              icon={Truck} color="#0ea5e9"
              onClick={() => onNavigate('/dispatch-report', { dateFrom: getYesterdayRange().dateFrom, dateTo: getYesterdayRange().dateTo, dispatchType: '' })}
            />
            <KpiCard
              label="Yesterday Export Dispatch" value={dispatchYesterday.exportTons.toFixed(1)} unit="Tons (Export)"
              icon={Globe} color="#16a34a"
              onClick={() => onNavigate('/dispatch-report', { dateFrom: getYesterdayRange().dateFrom, dateTo: getYesterdayRange().dateTo, dispatchType: 'Export' })}
            />
            <KpiCard
              label="Yesterday Local Dispatch" value={dispatchYesterday.localTons.toFixed(1)} unit="Tons (Local)"
              icon={MapPin} color="#f59e0b"
              onClick={() => onNavigate('/dispatch-report', { dateFrom: getYesterdayRange().dateFrom, dateTo: getYesterdayRange().dateTo, dispatchType: 'Local' })}
            />
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
