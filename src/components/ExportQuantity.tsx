import React, { useEffect, useState, useMemo } from 'react';
import { usePlant } from '@/lib/PlantContext';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, X, Check, Ship } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CHART_COLORS, getPlantConfig } from '@/lib/plantConfig';

interface ExportEntry {
  id: string; exportDate: string; filmCodeName: string; exportQuantityTons: number;
}

interface FilmCode { id: string; filmCodeName: string; status: string; }

export default function ExportQuantity() {
  const { selectedPlant } = usePlant();
  const { user, hasPermission } = useAuth();
  const [entries, setEntries] = useState<ExportEntry[]>([]);
  const [filmCodes, setFilmCodes] = useState<FilmCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [plantWiseData, setPlantWiseData] = useState<{ plant: string; tons: number }[]>([]);
  const [plantWiseMonths, setPlantWiseMonths] = useState<string[]>([]);
  const [plantWiseMonth, setPlantWiseMonth] = useState('');

  const plantColor = selectedPlant?.color || '#16a34a';
  const [form, setForm] = useState({ exportDate: new Date().toISOString().split('T')[0], filmCodeId: '', filmCodeName: '', exportQuantityTons: '' });

  const canAdd = user?.role === 'admin' || hasPermission('export-quantity.create');
  const canDelete = user?.role === 'admin' || hasPermission('export-quantity.delete');

  const thisMonthExport = useMemo(() => {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return entries.filter(e => e.exportDate.startsWith(monthPrefix)).reduce((s, e) => s + e.exportQuantityTons, 0);
  }, [entries]);

  const fetchData = async () => {
    if (!selectedPlant) return;
    setLoading(true);
    try {
      const [eqRes, fcRes] = await Promise.all([
        fetch(`/api/export-quantities?plantName=${selectedPlant.name}`),
        fetch('/api/film-codes'),
      ]);
      setEntries((await eqRes.json()).items || []);
      setFilmCodes(((await fcRes.json()).items || []).filter((f: FilmCode) => f.status === 'Active'));
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [selectedPlant]);

  const fetchPlantWise = async (month?: string) => {
    try {
      const url = month ? `/api/analytics/export-plant-wise?month=${month}` : '/api/analytics/export-plant-wise';
      const res = await fetch(url);
      const data = await res.json();
      setPlantWiseData(data.plantData || []);
      if (!month) setPlantWiseMonths(data.months || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchPlantWise(); }, []);

  const handlePlantWiseMonthChange = (month: string) => {
    setPlantWiseMonth(month);
    fetchPlantWise(month || undefined);
  };

  const handleSave = async () => {
    if (!form.filmCodeId || !form.exportQuantityTons) return;
    const fc = filmCodes.find(f => f.id === form.filmCodeId);
    const res = await fetch('/api/export-quantities', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exportDate: form.exportDate, plantId: selectedPlant?.id, plantName: selectedPlant?.name,
        filmCodeId: form.filmCodeId, filmCodeName: fc?.filmCodeName || '',
        exportQuantityTons: parseFloat(form.exportQuantityTons), createdByName: user?.name || '',
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.ok) {
      setSuccessMsg('❌ Save failed. ' + (body.error?.message || ''));
      setTimeout(() => setSuccessMsg(''), 4000);
      return;
    }
    setSuccessMsg('✅ Export recorded');
    setTimeout(() => { setSuccessMsg(''); setShowForm(false); }, 2000);
    setForm({ exportDate: new Date().toISOString().split('T')[0], filmCodeId: '', filmCodeName: '', exportQuantityTons: '' });
    fetchData();
    fetchPlantWise(plantWiseMonth || undefined);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return;
    const res = await fetch(`/api/export-quantities/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchData();
      fetchPlantWise(plantWiseMonth || undefined);
    }
  };

  const dailyData = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach(e => map.set(e.exportDate, (map.get(e.exportDate) || 0) + e.exportQuantityTons));
    return Array.from(map.entries()).map(([date, tons]) => ({ date, tons })).sort((a, b) => a.date.localeCompare(b.date));
  }, [entries]);

  const filmData = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach(e => map.set(e.filmCodeName, (map.get(e.filmCodeName) || 0) + e.exportQuantityTons));
    return Array.from(map.entries()).map(([film, tons]) => ({ name: film, value: tons }));
  }, [entries]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Export Quantity</h1>
          <p className="text-sm text-slate-500">{selectedPlant?.name} — Track export shipments</p>
        </div>
        {canAdd && (
          <Button onClick={() => setShowForm(true)} style={{ backgroundColor: plantColor }} className="text-white">
            <Plus className="w-4 h-4 mr-1" /> Add Export
          </Button>
        )}
      </div>

      {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg">{successMsg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: plantColor + '20' }}>
              <Ship className="w-5 h-5" style={{ color: plantColor }} />
            </div>
            <div>
              <p className="text-xs text-slate-500">This Month Export</p>
              <p className="text-2xl font-bold" style={{ color: plantColor }}>{thisMonthExport.toFixed(1)}</p>
              <p className="text-xs text-slate-400">Tons</p>
            </div>
          </div>
        </Card>
      </div>

      {showForm && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Add Export</h3>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Date</label>
              <Input type="date" value={form.exportDate} onChange={e => setForm({ ...form, exportDate: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Film Code *</label>
              <select value={form.filmCodeId} onChange={e => setForm({ ...form, filmCodeId: e.target.value })}
                className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
                <option value="">Select film</option>
                {filmCodes.map(f => <option key={f.id} value={f.id}>{f.filmCodeName}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Quantity (Tons) *</label>
              <Input type="number" min="0" value={form.exportQuantityTons}
                onChange={e => setForm({ ...form, exportQuantityTons: e.target.value })} />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSave} style={{ backgroundColor: plantColor }} className="text-white"><Check className="w-4 h-4 mr-1" /> Save</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Daily Export</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="tons" fill={plantColor} name="Tons" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Film-wise Export</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={filmData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value.toFixed(1)}T`}>
                {filmData.map((_, i) => <Cell key={i} fill={CHART_COLORS.film[i % CHART_COLORS.film.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left p-3 text-xs font-medium text-slate-500">Date</th>
                <th className="text-left p-3 text-xs font-medium text-slate-500">Film Code</th>
                <th className="text-right p-3 text-xs font-medium text-slate-500">Quantity (T)</th>
                <th className="text-center p-3 text-xs font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8 text-slate-400">Loading...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-slate-400">No export records yet.</td></tr>
              ) : (
                entries.slice(0, 100).map(e => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3">{e.exportDate}</td>
                    <td className="p-3">{e.filmCodeName}</td>
                    <td className="p-3 text-right font-medium">{e.exportQuantityTons.toFixed(1)}</td>
                    <td className="p-3 text-center">
                      {canDelete && (
                        <button onClick={() => handleDelete(e.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Plant Wise Export Graph */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Plant Wise Export</h3>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">Month:</label>
            <select
              value={plantWiseMonth}
              onChange={e => handlePlantWiseMonthChange(e.target.value)}
              className="h-8 px-2 text-sm border border-slate-200 rounded-lg bg-white"
            >
              <option value="">All Time</option>
              {plantWiseMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        {plantWiseData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={plantWiseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="plant" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(val: number) => `${val.toFixed(1)} Tons`} />
              <Bar dataKey="tons" name="Export (Tons)">
                {plantWiseData.map((entry) => {
                  const cfg = getPlantConfig(entry.plant);
                  return <Cell key={entry.plant} fill={cfg?.color || '#6366f1'} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-slate-400 py-8 text-sm">No export data available</p>
        )}
      </Card>
    </div>
  );
}
