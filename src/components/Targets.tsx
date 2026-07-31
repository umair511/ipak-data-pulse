import React, { useEffect, useState, useMemo } from 'react';
import { usePlant } from '@/lib/PlantContext';
import { useAuth } from '@/lib/AuthContext';
import { getMachinesForPlant, SHIFTS } from '@/lib/plantConfig';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';

interface Target {
  id: string; targetDate: string; shift: string; machineName: string;
  dailyTargetTons: number; actual?: number; achievement?: number;
}

export default function Targets() {
  const { selectedPlant } = usePlant();
  const { user, hasPermission } = useAuth();
  const canAdd = user?.role === 'admin' || hasPermission('targets.create');
  const canEdit = user?.role === 'admin' || hasPermission('targets.edit');
  const canDelete = user?.role === 'admin' || hasPermission('targets.delete');
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [validationMsg, setValidationMsg] = useState('');

  const plantColor = selectedPlant?.color || '#16a34a';
  const slitterMachines = useMemo(() =>
    selectedPlant ? getMachinesForPlant(selectedPlant.name).filter(m => m.section === 'Slitter') : [],
    [selectedPlant]
  );

  const [form, setForm] = useState({
    targetDate: new Date().toISOString().split('T')[0],
    shift: 'Morning',
    machineName: '',
    dailyTargetTons: '',
  });

  const fetchTargets = async () => {
    if (!selectedPlant) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/targets?plantName=${selectedPlant.name}`);
      const data = await res.json();
      setTargets(data.items || data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchTargets(); }, [selectedPlant]);

  const handleSave = async () => {
    if (!form.targetDate || !form.shift || !form.machineName || !form.dailyTargetTons) {
      setValidationMsg('Please fill all required fields.');
      setTimeout(() => setValidationMsg(''), 2000);
      return;
    }

    const payload = {
      targetDate: form.targetDate, shift: form.shift,
      plantId: selectedPlant?.id, plantName: selectedPlant?.name,
      machineId: null, machineName: form.machineName,
      dailyTargetTons: parseFloat(form.dailyTargetTons),
      createdByName: user?.name || '',
    };

    try {
      const url = editingId ? `/api/targets/${editingId}` : '/api/targets';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) {
        setErrorMsg(body.error?.message || `Save failed (HTTP ${res.status}).`);
        setTimeout(() => setErrorMsg(''), 4000);
        return;
      }
      setSuccessMsg(`Target saved — ${form.machineName} — ${form.shift} shift`);
      setTimeout(() => { setSuccessMsg(''); setShowForm(false); }, 2500);
      setForm({ targetDate: new Date().toISOString().split('T')[0], shift: 'Morning', machineName: '', dailyTargetTons: '' });
      setEditingId(null);
      fetchTargets();
    } catch {
      setErrorMsg('Failed to save target. Check your connection.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleEdit = (t: Target) => {
    setForm({ targetDate: t.targetDate, shift: t.shift, machineName: t.machineName, dailyTargetTons: String(t.dailyTargetTons) });
    setEditingId(t.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this target?')) return;
    const res = await fetch(`/api/targets/${id}`, { method: 'DELETE' });
    if (res.ok) fetchTargets();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Targets</h1>
          <p className="text-sm text-slate-500">{selectedPlant?.name} — Shift-wise Slitter targets</p>
        </div>
        {canAdd && (
        <Button onClick={() => { setForm({ targetDate: new Date().toISOString().split('T')[0], shift: 'Morning', machineName: '', dailyTargetTons: '' }); setEditingId(null); setShowForm(true); }}
          style={{ backgroundColor: plantColor }} className="text-white">
          <Plus className="w-4 h-4 mr-1" /> Set Target
        </Button>
        )}
      </div>

      {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg">{successMsg}</div>}
      {errorMsg && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg">{errorMsg}</div>}

      {showForm && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{editingId ? 'Edit Target' : 'Set Target'}</h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); setValidationMsg(''); }}><X className="w-4 h-4" /></button>
          </div>
          {validationMsg && <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-2 rounded-lg mb-3">{validationMsg}</div>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Date *</label>
              <Input type="date" value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Shift *</label>
              <div className="flex gap-1">
                {SHIFTS.map(s => (
                  <button key={s} onClick={() => setForm({ ...form, shift: s })}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${form.shift === s ? 'text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    style={form.shift === s ? { backgroundColor: plantColor } : {}}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Slitter Machine *</label>
              <select value={form.machineName} onChange={e => setForm({ ...form, machineName: e.target.value })}
                className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
                <option value="">Select machine</option>
                {slitterMachines.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Target (Tons) *</label>
              <Input type="number" min="0" step="0.01" value={form.dailyTargetTons}
                onChange={e => setForm({ ...form, dailyTargetTons: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSave} style={{ backgroundColor: plantColor }} className="text-white">
              <Check className="w-4 h-4 mr-1" /> {editingId ? 'Update' : 'Save'}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
          </div>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left p-3 text-xs font-medium text-slate-500">Date</th>
                <th className="text-left p-3 text-xs font-medium text-slate-500">Shift</th>
                <th className="text-left p-3 text-xs font-medium text-slate-500">Machine</th>
                <th className="text-right p-3 text-xs font-medium text-slate-500">Target (T)</th>
                <th className="text-center p-3 text-xs font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">Loading...</td></tr>
              ) : targets.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">No targets set yet.</td></tr>
              ) : (
                targets.slice(0, 200).map(t => (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3">{t.targetDate}</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100">{t.shift}</span></td>
                    <td className="p-3">{t.machineName}</td>
                    <td className="p-3 text-right font-medium">{t.dailyTargetTons.toFixed(1)}</td>
                    <td className="p-3 text-center">
                      <div className="flex gap-1 justify-center">
                        {canEdit && <button onClick={() => handleEdit(t)} className="p-1 hover:bg-slate-100 rounded"><Pencil className="w-3.5 h-3.5 text-slate-500" /></button>}
                        {canDelete && <button onClick={() => handleDelete(t.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>}
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
