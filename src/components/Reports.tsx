import React, { useEffect, useState, useMemo } from 'react';
import { usePlant } from '@/lib/PlantContext';
import { useAuth } from '@/lib/AuthContext';
import { getMachinesForPlant, REPORT_TYPES, SECTIONS, SHIFTS } from '@/lib/plantConfig';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ReportRow { [key: string]: unknown; }

export default function Reports({ initialParams }: { initialParams?: Record<string, string> }) {
  const { selectedPlant } = usePlant();
  const [reportType, setReportType] = useState(initialParams?.reportType || 'Overall Production');
  const { user, hasPermission } = useAuth();
  const canExport = user?.role === 'admin' || hasPermission('reports.export');
  const [section, setSection] = useState(initialParams?.section || '');
  const [machine, setMachine] = useState('');
  const [shift, setShift] = useState('');
  const [dateFrom, setDateFrom] = useState(initialParams?.dateFrom || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(initialParams?.dateTo || new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  const plantColor = selectedPlant?.color || '#16a34a';
  const allMachines = useMemo(() => selectedPlant ? getMachinesForPlant(selectedPlant.name) : [], [selectedPlant]);
  const filteredMachines = useMemo(() => section ? allMachines.filter(m => m.section === section) : allMachines, [allMachines, section]);

  const fetchReport = async () => {
    if (!selectedPlant) return;
    setLoading(true);
    const params = new URLSearchParams({
      plant: selectedPlant.name, reportType, dateFrom, dateTo,
    });
    if (section) params.set('section', section);
    if (machine) params.set('machine', machine);
    if (shift) params.set('shift', shift);
    try {
      const res = await fetch(`/api/reports?${params}`);
      const json = await res.json();
      setData(json.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchReport(); }, [selectedPlant, reportType]);

  const topReasons = useMemo(() => {
    if (reportType !== 'Downtime') return [];
    const map = new Map<string, number>();
    data.forEach(r => {
      const reason = (r.reason as string) || 'Unknown';
      map.set(reason, (map.get(reason) || 0) + ((r.downtimeHours as number) || 0) * 60);
    });
    return Array.from(map.entries())
      .map(([reason, mins]) => ({ reason, hours: mins / 60 }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 4);
  }, [data, reportType]);

  const columns = useMemo(() => {
    if (data.length === 0) return [];
    const keys = Object.keys(data[0]).filter(k => k !== 'id' && k !== 'plantId' && k !== 'plantName');
    return keys;
  }, [data]);

  const formatValue = (val: unknown, key: string) => {
    if (typeof val === 'number') {
      if (key.includes('Percent') || key === 'achievement') return `${val.toFixed(1)}%`;
      if (key.includes('hours') || key.includes('Hours')) return val.toFixed(1);
      return val.toFixed(1);
    }
    return String(val ?? '-');
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500">{selectedPlant?.name} — Generate filtered reports</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-slate-600">Report Type</label>
            <select value={reportType} onChange={e => setReportType(e.target.value)}
              className="w-48 h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
              {REPORT_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Section</label>
            <select value={section} onChange={e => { setSection(e.target.value); setMachine(''); }}
              className="w-36 h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
              <option value="">All Sections</option>
              {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Machine</label>
            <select value={machine} onChange={e => setMachine(e.target.value)}
              className="w-44 h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
              <option value="">All Machines</option>
              {filteredMachines.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Shift</label>
            <select value={shift} onChange={e => setShift(e.target.value)}
              className="w-32 h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
              <option value="">All Shifts</option>
              {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">From</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">To</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
          </div>
          <Button onClick={fetchReport} style={{ backgroundColor: plantColor }} className="text-white">Generate</Button>
          <Button variant="outline" onClick={() => { setSection(''); setMachine(''); setShift(''); }}>Clear</Button>
        </div>
      </Card>

      {reportType === 'Downtime' && topReasons.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm text-slate-700 mb-3">Top 4 Downtime Reasons</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {topReasons.map((r, i) => (
              <div key={r.reason} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">#{i + 1}</p>
                <p className="font-medium text-sm">{r.reason}</p>
                <p className="text-lg font-bold" style={{ color: plantColor }}>{r.hours.toFixed(1)} hrs</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {columns.map(col => (
                  <th key={col} className="text-left p-3 text-xs font-medium text-slate-500 capitalize">
                    {col.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length} className="text-center py-8 text-slate-400">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={columns.length} className="text-center py-8 text-slate-400">No data for the selected filters.</td></tr>
              ) : (
                data.slice(0, 500).map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    {columns.map(col => (
                      <td key={col} className="p-3">
                        {col === 'wastePercent' ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${(row[col] as number) > 5 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                            {formatValue(row[col], col)}
                          </span>
                        ) : col === 'achievement' ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${(row[col] as number) >= 100 ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-600'}`}>
                            {formatValue(row[col], col)}
                          </span>
                        ) : (
                          formatValue(row[col], col)
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data.length > 0 && <p className="p-3 text-xs text-slate-400 border-t border-slate-100">{data.length} records</p>}
      </Card>
    </div>
  );
}
