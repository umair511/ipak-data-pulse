import React, { useEffect, useState, useMemo } from 'react';
import { usePlant } from '@/lib/PlantContext';
import { useAuth } from '@/lib/AuthContext';
import { PLANTS, getPlantConfig } from '@/lib/plantConfig';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, X, Check, Package, Pencil } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

interface PackingRecord {
  id: string; costMonth: string; plantName: string;
  totalProductionTons: number; totalCostRs: number;
  bomTotalCostRs: number; actualTotalCostRs: number;
  bomPackingCost?: number; actualPackingCost?: number;
}

function tonsToKg(tons: number): number { return tons * 1000; }

export default function PackingCost() {
  const { selectedPlant } = usePlant();
  const { user, hasPermission } = useAuth();
  const [records, setRecords] = useState<PackingRecord[]>([]);
  const [allRecords, setAllRecords] = useState<PackingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [sortField, setSortField] = useState('costMonth');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [editingRecord, setEditingRecord] = useState<PackingRecord | null>(null);

  const plantColor = selectedPlant?.color || '#16a34a';
  const canAdd = user?.role === 'admin' || hasPermission('packing-cost.create');
  const canDelete = user?.role === 'admin' || hasPermission('packing-cost.delete');

  const existingMonths = useMemo(() => {
    const months = new Set(records.map(r => r.costMonth));
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [records]);

  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const currentMonthRecord = useMemo(() => records.find(r => r.costMonth === currentMonthKey) || null, [records, currentMonthKey]);

  const [form, setForm] = useState({
    costMonth: currentMonthKey,
    totalProductionTons: '', bomTotalCostRs: '', actualTotalCostRs: '',
  });

  const computedForm = useMemo(() => {
    const prodKg = tonsToKg(parseFloat(form.totalProductionTons) || 0);
    const bom = parseFloat(form.bomTotalCostRs) || 0;
    const actual = parseFloat(form.actualTotalCostRs) || 0;
    return {
      bomPackingCost: prodKg > 0 ? bom / prodKg : 0,
      actualPackingCost: prodKg > 0 ? actual / prodKg : 0,
    };
  }, [form]);

  const fetchData = async () => {
    if (!selectedPlant) return;
    setLoading(true);
    try {
      const [pcRes, allRes] = await Promise.all([
        fetch(`/api/packing-costs?plantName=${selectedPlant.name}`),
        fetch('/api/packing-costs'),
      ]);
      setRecords((await pcRes.json()).items || []);
      setAllRecords((await allRes.json()).items || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [selectedPlant]);

  const handleSave = async () => {
    if (!form.totalProductionTons) return;

    if (editingRecord) {
      const res = await fetch(`/api/packing-costs/${editingRecord.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalProductionTons: parseFloat(form.totalProductionTons),
          bomTotalCostRs: parseFloat(form.bomTotalCostRs) || 0,
          actualTotalCostRs: parseFloat(form.actualTotalCostRs) || 0,
          bomPackingCost: computedForm.bomPackingCost,
          actualPackingCost: computedForm.actualPackingCost,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) {
        setSuccessMsg('❌ Update failed. ' + (body.error?.message || ''));
        setTimeout(() => setSuccessMsg(''), 4000);
        return;
      }
      setSuccessMsg('✅ Packing cost updated');
    } else {
      const res = await fetch('/api/packing-costs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          costMonth: form.costMonth, plantId: selectedPlant?.id, plantName: selectedPlant?.name,
          totalProductionTons: parseFloat(form.totalProductionTons),
          totalCostRs: 0,
          bomTotalCostRs: parseFloat(form.bomTotalCostRs) || 0,
          actualTotalCostRs: parseFloat(form.actualTotalCostRs) || 0,
          bomPackingCost: computedForm.bomPackingCost,
          actualPackingCost: computedForm.actualPackingCost,
          createdByName: user?.name || '',
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) {
        setSuccessMsg('❌ Save failed. ' + (body.error?.message || ''));
        setTimeout(() => setSuccessMsg(''), 4000);
        return;
      }
      setSuccessMsg('✅ Packing cost saved');
    }

    setTimeout(() => { setSuccessMsg(''); setShowForm(false); setEditingRecord(null); }, 2000);
    setForm({ costMonth: currentMonthKey, totalProductionTons: '', bomTotalCostRs: '', actualTotalCostRs: '' });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return;
    const res = await fetch(`/api/packing-costs/${id}`, { method: 'DELETE' });
    if (res.ok) fetchData();
  };

  const handleEdit = (record: PackingRecord) => {
    setEditingRecord(record);
    setForm({
      costMonth: record.costMonth,
      totalProductionTons: String(record.totalProductionTons),
      bomTotalCostRs: String(record.bomTotalCostRs),
      actualTotalCostRs: String(record.actualTotalCostRs),
    });
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingRecord(null);
    setForm({ costMonth: currentMonthKey, totalProductionTons: '', bomTotalCostRs: '', actualTotalCostRs: '' });
    setShowForm(true);
  };

  const filteredRecords = useMemo(() => {
    let filtered = records;
    if (selectedMonth) filtered = filtered.filter(r => r.costMonth === selectedMonth);
    return filtered.sort((a, b) => {
      const aVal = a[sortField as keyof PackingRecord] ?? '';
      const bVal = b[sortField as keyof PackingRecord] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [records, sortField, sortDir, selectedMonth]);

  const allPlantSummary = useMemo(() => {
    const plantMap = new Map<string, { production: number; bom: number; actual: number }>();
    allRecords.forEach(r => {
      const cur = plantMap.get(r.plantName) || { production: 0, bom: 0, actual: 0 };
      cur.production += r.totalProductionTons;
      cur.bom += r.bomTotalCostRs;
      cur.actual += r.actualTotalCostRs;
      plantMap.set(r.plantName, cur);
    });
    const rows = Array.from(plantMap.entries()).map(([plant, v]) => {
      const prodKg = tonsToKg(v.production);
      return {
        plant, production: v.production,
        bomPackingCost: prodKg > 0 ? v.bom / prodKg : 0,
        actualPackingCost: prodKg > 0 ? v.actual / prodKg : 0,
      };
    });
    const totalProd = rows.reduce((s, r) => s + r.production, 0);
    const totalProdKg = tonsToKg(totalProd);
    const totalBom = Array.from(plantMap.values()).reduce((s, v) => s + v.bom, 0);
    const totalActual = Array.from(plantMap.values()).reduce((s, v) => s + v.actual, 0);
    return {
      rows, total: {
        production: totalProd,
        bomCost: totalProdKg > 0 ? totalBom / totalProdKg : 0,
        actualCost: totalProdKg > 0 ? totalActual / totalProdKg : 0,
      },
    };
  }, [allRecords]);

  const analyticsData = useMemo(() => {
    const plantRows = PLANTS.map(p => {
      const plantRecords = allRecords.filter(r => r.plantName === p.name);
      const latest = plantRecords.sort((a, b) => b.costMonth.localeCompare(a.costMonth))[0];
      return { plant: p.name, bomPacking: latest?.bomPackingCost || 0, actualPacking: latest?.actualPackingCost || 0, isGroup: false };
    });
    if (allPlantSummary.total.production > 0) {
      plantRows.push({ plant: 'Group (Total)', bomPacking: allPlantSummary.total.bomCost, actualPacking: allPlantSummary.total.actualCost, isGroup: true });
    }
    return plantRows;
  }, [allRecords, allPlantSummary]);

  const getBarFill = (plantName: string, isBom: boolean) => {
    if (plantName === 'Group (Total)') return isBom ? '#94a3b8' : '#475569';
    const cfg = getPlantConfig(plantName);
    const base = cfg?.color || '#6366f1';
    if (isBom) return base + '88';
    return base;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Packing Cost</h1>
          <p className="text-sm text-slate-500">{selectedPlant?.name} — Monthly packing cost tracking</p>
        </div>
        {canAdd && (
          currentMonthRecord ? (
            <Button onClick={() => handleEdit(currentMonthRecord)} variant="outline" className="border-slate-300">
              <Pencil className="w-4 h-4 mr-1" /> Edit This Month
            </Button>
          ) : (
            <Button onClick={handleAddNew} style={{ backgroundColor: plantColor }} className="text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Record
            </Button>
          )
        )}
      </div>

      {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg">{successMsg}</div>}

      {showForm && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{editingRecord ? 'Edit Packing Cost' : 'Add Packing Cost'}</h3>
            <button onClick={() => { setShowForm(false); setEditingRecord(null); }}><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Month (YYYY-MM) *</label>
              <Input
                type="month"
                value={form.costMonth}
                disabled={!!editingRecord}
                onChange={e => setForm({ ...form, costMonth: e.target.value })}
                className={editingRecord ? 'bg-slate-100 opacity-70' : ''}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Total Production (Tons) *</label>
              <Input type="number" min="0" value={form.totalProductionTons}
                onChange={e => setForm({ ...form, totalProductionTons: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">BOM Total Cost (Rs)</label>
              <Input type="number" min="0" value={form.bomTotalCostRs}
                onChange={e => setForm({ ...form, bomTotalCostRs: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Actual Total Cost (Rs)</label>
              <Input type="number" min="0" value={form.actualTotalCostRs}
                onChange={e => setForm({ ...form, actualTotalCostRs: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">BOM Cost/Kg (Auto)</label>
              <Input type="text" value={`Rs ${computedForm.bomPackingCost.toFixed(4)}`} disabled className="bg-slate-50" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Actual Cost/Kg (Auto)</label>
              <Input type="text" value={`Rs ${computedForm.actualPackingCost.toFixed(4)}`} disabled className="bg-slate-50" />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSave} style={{ backgroundColor: plantColor }} className="text-white"><Check className="w-4 h-4 mr-1" /> {editingRecord ? 'Update' : 'Save'}</Button>
            </div>
          </div>
        </Card>
      )}

      {/* All Plants Summary */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Package className="w-4 h-4" /> All Plants Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left p-2 text-xs">Plant</th>
                <th className="text-right p-2 text-xs">Production (T)</th>
                <th className="text-right p-2 text-xs">BOM Cost/Kg</th>
                <th className="text-right p-2 text-xs">Actual Cost/Kg</th>
              </tr>
            </thead>
            <tbody>
              {allPlantSummary.rows.map(r => (
                <tr key={r.plant} className="border-b border-slate-100">
                  <td className="p-2 font-medium">{r.plant}</td>
                  <td className="p-2 text-right">{r.production.toFixed(1)}</td>
                  <td className="p-2 text-right">Rs {r.bomPackingCost.toFixed(4)}</td>
                  <td className="p-2 text-right">Rs {r.actualPackingCost.toFixed(4)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-300 font-bold">
                <td className="p-2">Group (Total)</td>
                <td className="p-2 text-right">{allPlantSummary.total.production.toFixed(1)}</td>
                <td className="p-2 text-right">Rs {allPlantSummary.total.bomCost.toFixed(4)}</td>
                <td className="p-2 text-right">Rs {allPlantSummary.total.actualCost.toFixed(4)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Analytics */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Plant-wise Packing Cost Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analyticsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="plant" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(val: number) => `Rs ${val.toFixed(4)}`} />
            <Legend />
            <Bar dataKey="bomPacking" name="BOM Cost/Kg">
              {analyticsData.map((entry) => (
                <Cell key={`bom-${entry.plant}`} fill={getBarFill(entry.plant, true)} />
              ))}
            </Bar>
            <Bar dataKey="actualPacking" name="Actual Cost/Kg">
              {analyticsData.map((entry) => (
                <Cell key={`act-${entry.plant}`} fill={getBarFill(entry.plant, false)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Records Table */}
      <Card>
        <div className="p-3 border-b border-slate-200 flex items-center gap-3">
          <label className="text-xs font-medium text-slate-600">Filter by Month:</label>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white w-48"
          >
            <option value="">All Months</option>
            {existingMonths.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {selectedMonth && (
            <button onClick={() => setSelectedMonth('')} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left p-3 text-xs cursor-pointer hover:bg-slate-50" onClick={() => { setSortField('costMonth'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Month</th>
                <th className="text-right p-3 text-xs">Production (T)</th>
                <th className="text-right p-3 text-xs">BOM Cost/Kg</th>
                <th className="text-right p-3 text-xs">Actual Cost/Kg</th>
                <th className="text-center p-3 text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">Loading...</td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">No records.</td></tr>
              ) : (
                filteredRecords.map(r => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-medium">{r.costMonth}</td>
                    <td className="p-3 text-right">{r.totalProductionTons.toFixed(1)}</td>
                    <td className="p-3 text-right">Rs {(r.bomPackingCost || 0).toFixed(4)}</td>
                    <td className="p-3 text-right">Rs {(r.actualPackingCost || 0).toFixed(4)}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {canAdd && (
                          <button onClick={() => handleEdit(r)} className="p-1 hover:bg-blue-50 rounded" title="Edit">
                            <Pencil className="w-3.5 h-3.5 text-blue-400" />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDelete(r.id)} className="p-1 hover:bg-red-50 rounded" title="Delete">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
