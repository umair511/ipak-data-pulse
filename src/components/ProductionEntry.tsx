import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { usePlant } from '@/lib/PlantContext';
import { useAuth } from '@/lib/AuthContext';
import { getMachinesForPlant, getSectionForMachine, SHIFTS } from '@/lib/plantConfig';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Pencil, Trash2, X, Check, Upload, FileSpreadsheet,
  AlertCircle, CheckCircle2, XCircle, Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ProductionEntry {
  id: string; entryDate: string; shift: string; section: string;
  machineName: string; filmCodeName: string; productionTons: number;
  wasteTons: number; wastePercent: number | null; downtimeMinutes: number;
  downtimeReasonLabel?: string; numberOfSettings?: number; numberOfCycles?: number;
}

interface FilmCode { id: string; filmCodeName: string; status: string; }
interface DowntimeReason { id: string; reasonLabel: string; status: string; }

interface ImportRow {
  rowIndex: number;
  entryDate: string;
  shift: string;
  machineName: string;
  filmCodeName: string;
  productionTons: number;
  wasteTons: number;
  downtimeMinutes: number;
  downtimeReasonLabel: string;
  numberOfSettings: number;
  numberOfCycles: number;
  section: string;
  valid: boolean;
  errors: string[];
}

interface ImportResult {
  totalRecords: number;
  successCount: number;
  failCount: number;
  failures: { rowIndex: number; entryDate: string; machine: string; reason: string }[];
}

const EXCEL_COLUMN_MAP: Record<string, string> = {
  'date': 'entryDate',
  'entrydate': 'entryDate',
  'entry_date': 'entryDate',
  'shift': 'shift',
  'plant': 'plantName',
  'plantname': 'plantName',
  'plant_name': 'plantName',
  'section': 'section',
  'machine': 'machineName',
  'machinename': 'machineName',
  'machine_name': 'machineName',
  'film code': 'filmCodeName',
  'filmcode': 'filmCodeName',
  'film_code': 'filmCodeName',
  'film code name': 'filmCodeName',
  'filmcodename': 'filmCodeName',
  'production (tons)': 'productionTons',
  'production(tons)': 'productionTons',
  'production': 'productionTons',
  'productiontons': 'productionTons',
  'production_tons': 'productionTons',
  'waste (tons)': 'wasteTons',
  'waste(tons)': 'wasteTons',
  'waste': 'wasteTons',
  'wastetons': 'wasteTons',
  'waste_tons': 'wasteTons',
  'downtime': 'downtimeMinutes',
  'downtime (min)': 'downtimeMinutes',
  'downtime(min)': 'downtimeMinutes',
  'downtimeminutes': 'downtimeMinutes',
  'downtime_minutes': 'downtimeMinutes',
  'downtime reason': 'downtimeReasonLabel',
  'downtimereason': 'downtimeReasonLabel',
  'downtime_reason': 'downtimeReasonLabel',
  'reason': 'downtimeReasonLabel',
};

function normalizeShift(val: string): string {
  const lower = val.trim().toLowerCase();
  if (lower === 'morning' || lower === 'm') return 'Morning';
  if (lower === 'evening' || lower === 'e') return 'Evening';
  if (lower === 'night' || lower === 'n') return 'Night';
  return val.trim();
}

function parseDateValue(val: unknown): string {
  if (typeof val === 'number') {
    const epoch = new Date(1900, 0, 1);
    const date = new Date(epoch.getTime() + (val - 1) * 86400000);
    return date.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  if (!str) return '';
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  const slashMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) return `${slashMatch[3]}-${slashMatch[2].padStart(2, '0')}-${slashMatch[1].padStart(2, '0')}`;
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (dmyMatch) {
    const year = parseInt(dmyMatch[3]) > 50 ? 1900 + parseInt(dmyMatch[3]) : 2000 + parseInt(dmyMatch[3]);
    return `${year}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }
  const tryDate = new Date(str);
  if (!isNaN(tryDate.getTime())) return tryDate.toISOString().split('T')[0];
  return str;
}

export default function ProductionEntry() {
  const { selectedPlant } = usePlant();
  const { user, hasPermission } = useAuth();
  const canView = user?.role === 'admin' || hasPermission('production.view');
  const canAdd = user?.role === 'admin' || hasPermission('production.create');
  const canEdit = user?.role === 'admin' || hasPermission('production.edit');
  const canDelete = user?.role === 'admin' || hasPermission('production.delete');
  const canImport = user?.role === 'admin' || hasPermission('production.import');
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [filmCodes, setFilmCodes] = useState<FilmCode[]>([]);
  const [reasons, setReasons] = useState<DowntimeReason[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const plantColor = selectedPlant?.color || '#16a34a';
  const machines = useMemo(() => selectedPlant ? getMachinesForPlant(selectedPlant.name) : [], [selectedPlant]);
  const machineNames = useMemo(() => machines.map(m => m.name), [machines]);

  const [form, setForm] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    shift: 'Morning',
    machineName: '',
    filmCodeId: '',
    filmCodeName: '',
    productionTons: '',
    wasteTons: '',
    downtimeMinutes: '0',
    downtimeReasonId: '',
    downtimeReasonLabel: '',
    numberOfSettings: '',
    numberOfCycles: '',
  });

  const section = form.machineName ? getSectionForMachine(selectedPlant?.name || '', form.machineName) : '';
  const wastePercent = form.productionTons && parseFloat(form.productionTons) > 0
    ? ((parseFloat(form.wasteTons) || 0) / parseFloat(form.productionTons) * 100).toFixed(2)
    : '0.00';

  const fetchData = async () => {
    if (!selectedPlant) return;
    setLoading(true);
    try {
      const [entriesRes, fcRes, drRes] = await Promise.all([
        fetch(`/api/production-entries?plantName=${selectedPlant.name}`),
        fetch('/api/film-codes'),
        fetch('/api/downtime-reasons'),
      ]);
      const entriesData = await entriesRes.json();
      const fcData = await fcRes.json();
      const drData = await drRes.json();
      setEntries(entriesData.items || entriesData || []);
      setFilmCodes((fcData.items || fcData || []).filter((f: FilmCode) => f.status === 'Active'));
      setReasons((drData.items || drData || []).filter((d: DowntimeReason) => d.status === 'Active'));
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [selectedPlant]);

  const resetForm = () => {
    setForm({
      entryDate: new Date().toISOString().split('T')[0], shift: 'Morning',
      machineName: '', filmCodeId: '', filmCodeName: '', productionTons: '',
      wasteTons: '', downtimeMinutes: '0', downtimeReasonId: '', downtimeReasonLabel: '',
      numberOfSettings: '', numberOfCycles: '',
    });
    setEditingId(null);
    setErrorMsg('');
  };

  const handleSave = async () => {
    if (!form.entryDate || !form.shift || !form.machineName || !form.filmCodeId || !form.productionTons) {
      setErrorMsg('Please fill all required fields.');
      setTimeout(() => setErrorMsg(''), 2000);
      return;
    }
    if (parseFloat(form.downtimeMinutes) > 0 && !form.downtimeReasonId) {
      setErrorMsg('Downtime reason is required when downtime > 0.');
      setTimeout(() => setErrorMsg(''), 2000);
      return;
    }
    if (section === 'Slitter' && !form.numberOfSettings) {
      setErrorMsg('Number of settings is required for Slitter.');
      setTimeout(() => setErrorMsg(''), 2000);
      return;
    }

    const filmCode = filmCodes.find(f => f.id === form.filmCodeId);
    const payload = {
      entryDate: form.entryDate, shift: form.shift,
      plantId: selectedPlant?.id, plantName: selectedPlant?.name,
      section, machineId: null, machineName: form.machineName,
      filmCodeId: form.filmCodeId, filmCodeName: filmCode?.filmCodeName || '',
      productionTons: parseFloat(form.productionTons),
      wasteTons: parseFloat(form.wasteTons) || 0,
      wastePercent: parseFloat(wastePercent),
      downtimeMinutes: parseFloat(form.downtimeMinutes) || 0,
      downtimeReasonId: form.downtimeReasonId || null,
      downtimeReasonLabel: form.downtimeReasonLabel || null,
      numberOfSettings: section === 'Slitter' ? parseInt(form.numberOfSettings) || 0 : null,
      numberOfCycles: section === 'Metallizer' ? parseInt(form.numberOfCycles) || 0 : null,
      createdByName: user?.name || '',
    };

    try {
      const url = editingId ? `/api/production-entries/${editingId}` : '/api/production-entries';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) {
        setErrorMsg(body.error?.message || `Save failed (HTTP ${res.status}).`);
        setTimeout(() => setErrorMsg(''), 4000);
        return;
      }
      setSuccessMsg('✅ Data Saved Successfully');
      setTimeout(() => { setSuccessMsg(''); setShowForm(false); }, 2500);
      resetForm();
      fetchData();
    } catch {
      setErrorMsg('Failed to save entry. Check your connection.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleEdit = (entry: ProductionEntry) => {
    setForm({
      entryDate: entry.entryDate, shift: entry.shift, machineName: entry.machineName,
      filmCodeId: '', filmCodeName: entry.filmCodeName,
      productionTons: String(entry.productionTons), wasteTons: String(entry.wasteTons),
      downtimeMinutes: String(entry.downtimeMinutes), downtimeReasonId: '', downtimeReasonLabel: entry.downtimeReasonLabel || '',
      numberOfSettings: entry.numberOfSettings ? String(entry.numberOfSettings) : '',
      numberOfCycles: entry.numberOfCycles ? String(entry.numberOfCycles) : '',
    });
    setEditingId(entry.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    const res = await fetch(`/api/production-entries/${id}`, { method: 'DELETE' });
    if (res.ok) fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Production Entry</h1>
          <p className="text-sm text-slate-500">{selectedPlant?.name} — Record production data</p>
        </div>
        <div className="flex gap-2">
          {canImport && (
            <ImportButton
              plantColor={plantColor}
              machineNames={machineNames}
              filmCodes={filmCodes}
              reasons={reasons}
              onSuccess={() => { setSuccessMsg('✅ Import completed'); setTimeout(() => setSuccessMsg(''), 3000); fetchData(); }}
            />
          )}
          {canAdd && (
            <Button onClick={() => { resetForm(); setShowForm(true); }} style={{ backgroundColor: plantColor }} className="text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Entry
            </Button>
          )}
        </div>
      </div>

      {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg">{successMsg}</div>}
      {errorMsg && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg">{errorMsg}</div>}

      {showForm && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{editingId ? 'Edit Entry' : 'New Entry'}</h3>
            <button onClick={() => { setShowForm(false); resetForm(); }}><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Date *</label>
              <Input type="date" value={form.entryDate} onChange={e => setForm({ ...form, entryDate: e.target.value })} />
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
              <label className="text-xs font-medium text-slate-600">Machine *</label>
              <select value={form.machineName} onChange={e => setForm({ ...form, machineName: e.target.value })}
                className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
                <option value="">Select machine</option>
                {machines.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Film Code *</label>
              <select value={form.filmCodeId} onChange={e => setForm({ ...form, filmCodeId: e.target.value })}
                className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
                <option value="">Select film code</option>
                {filmCodes.map(f => <option key={f.id} value={f.id}>{f.filmCodeName}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Production (Tons) *</label>
              <Input type="number" min="0" step="0.01" value={form.productionTons}
                onChange={e => setForm({ ...form, productionTons: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Waste (Tons)</label>
              <Input type="number" min="0" step="0.01" value={form.wasteTons}
                onChange={e => setForm({ ...form, wasteTons: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Waste %</label>
              <Input type="text" value={`${wastePercent}%`} disabled className="bg-slate-50" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Downtime (Min)</label>
              <Input type="number" min="0" value={form.downtimeMinutes}
                onChange={e => setForm({ ...form, downtimeMinutes: e.target.value })} />
            </div>
            {parseFloat(form.downtimeMinutes) > 0 && (
              <div>
                <label className="text-xs font-medium text-slate-600">Downtime Reason *</label>
                <select value={form.downtimeReasonId} onChange={e => {
                  const r = reasons.find(r => r.id === e.target.value);
                  setForm({ ...form, downtimeReasonId: e.target.value, downtimeReasonLabel: r?.reasonLabel || '' });
                }} className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
                  <option value="">Select reason</option>
                  {reasons.map(r => <option key={r.id} value={r.id}>{r.reasonLabel}</option>)}
                </select>
              </div>
            )}
            {section === 'Slitter' && (
              <div>
                <label className="text-xs font-medium text-slate-600">Number of Settings *</label>
                <Input type="number" min="0" value={form.numberOfSettings}
                  onChange={e => setForm({ ...form, numberOfSettings: e.target.value })} />
              </div>
            )}
            {section === 'Metallizer' && (
              <div>
                <label className="text-xs font-medium text-slate-600">Number of Cycles</label>
                <Input type="number" min="0" value={form.numberOfCycles}
                  onChange={e => setForm({ ...form, numberOfCycles: e.target.value })} />
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSave} style={{ backgroundColor: plantColor }} className="text-white">
              <Check className="w-4 h-4 mr-1" /> {editingId ? 'Update' : 'Save'}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
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
                <th className="text-left p-3 text-xs font-medium text-slate-500">Film</th>
                <th className="text-right p-3 text-xs font-medium text-slate-500">Prod (T)</th>
                <th className="text-right p-3 text-xs font-medium text-slate-500">Waste (T)</th>
                <th className="text-right p-3 text-xs font-medium text-slate-500">Waste %</th>
                <th className="text-right p-3 text-xs font-medium text-slate-500">DT (Min)</th>
                <th className="text-center p-3 text-xs font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 text-slate-400">Loading...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-slate-400">No entries yet. Click "Add Entry" to start.</td></tr>
              ) : (
                entries.slice(0, 200).map(entry => (
                  <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3">{entry.entryDate}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100">{entry.shift}</span>
                    </td>
                    <td className="p-3">{entry.machineName}</td>
                    <td className="p-3">{entry.filmCodeName}</td>
                    <td className="p-3 text-right font-medium">{entry.productionTons.toFixed(1)}</td>
                    <td className="p-3 text-right">{entry.wasteTons.toFixed(1)}</td>
                    <td className="p-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${(entry.wastePercent || 0) > 5 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                        {(entry.wastePercent || 0).toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-3 text-right">{entry.downtimeMinutes}</td>
                    <td className="p-3 text-center">
                      <div className="flex gap-1 justify-center">
                        {canEdit && (
                        <button onClick={() => handleEdit(entry)} className="p-1 hover:bg-slate-100 rounded">
                          <Pencil className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                        )}
                        {canDelete && (
                        <button onClick={() => handleDelete(entry.id)} className="p-1 hover:bg-red-50 rounded">
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

/* ═══════════════════════════════════════════════════════════════
   EXCEL IMPORT COMPONENT
   ═══════════════════════════════════════════════════════════════ */
function ImportButton({
  plantColor, machineNames, filmCodes, reasons, onSuccess,
}: {
  plantColor: string;
  machineNames: string[];
  filmCodes: FilmCode[];
  reasons: DowntimeReason[];
  onSuccess: () => void;
}) {
  const { selectedPlant } = usePlant();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [importState, setImportState] = useState<
    'idle' | 'parsing' | 'preview' | 'importing' | 'done'
  >('idle');
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [parseError, setParseError] = useState('');

  const resetDialog = useCallback(() => {
    setImportState('idle');
    setImportRows([]);
    setImportResult(null);
    setImportProgress({ current: 0, total: 0 });
    setParseError('');
  }, []);

  const handleClose = useCallback(() => {
    setShowDialog(false);
    setTimeout(resetDialog, 200);
  }, [resetDialog]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportState('parsing');
    setParseError('');

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      if (rawData.length === 0) {
        setParseError('The Excel file is empty or has no data rows.');
        setImportState('idle');
        return;
      }

      const headers = Object.keys(rawData[0]);
      const columnMapping: Record<string, string> = {};
      headers.forEach(h => {
        const normalized = h.trim().toLowerCase();
        const mapped = EXCEL_COLUMN_MAP[normalized];
        if (mapped) columnMapping[h] = mapped;
      });

      const allFilmCodes = filmCodes;
      const allReasons = reasons;
      const filmCodeMap = new Map<string, FilmCode>();
      allFilmCodes.forEach(fc => filmCodeMap.set(fc.filmCodeName.toLowerCase(), fc));
      const reasonMap = new Map<string, DowntimeReason>();
      allReasons.forEach(r => reasonMap.set(r.reasonLabel.toLowerCase(), r));

      const parsedRows: ImportRow[] = rawData.map((row, idx) => {
        const errors: string[] = [];
        const entry: Record<string, unknown> = {};

        Object.entries(columnMapping).forEach(([excelCol, field]) => {
          entry[field] = row[excelCol];
        });

        const entryDate = parseDateValue(entry.entryDate);
        if (!entryDate) errors.push('Date is required');

        const shift = normalizeShift(String(entry.shift || ''));
        if (!shift || !['Morning', 'Evening', 'Night'].includes(shift)) {
          errors.push(`Invalid shift "${entry.shift}". Use Morning, Evening, or Night`);
        }

        const machineName = String(entry.machineName || '').trim();
        if (!machineName) {
          errors.push('Machine is required');
        } else if (!machineNames.includes(machineName)) {
          errors.push(`Machine "${machineName}" not found in ${selectedPlant?.name || 'this plant'}`);
        }

        const filmCodeName = String(entry.filmCodeName || '').trim();
        if (!filmCodeName) {
          errors.push('Film Code is required');
        } else if (!filmCodeMap.has(filmCodeName.toLowerCase())) {
          errors.push(`Film Code "${filmCodeName}" not found in system`);
        }

        const productionTons = parseFloat(String(entry.productionTons || '0'));
        if (!entry.productionTons || isNaN(productionTons) || productionTons <= 0) {
          errors.push('Production (Tons) must be greater than 0');
        }

        const wasteTons = parseFloat(String(entry.wasteTons || '0'));
        if (isNaN(wasteTons) || wasteTons < 0) {
          errors.push('Waste (Tons) cannot be negative');
        }

        const downtimeMinutes = parseFloat(String(entry.downtimeMinutes || '0'));
        if (isNaN(downtimeMinutes) || downtimeMinutes < 0) {
          errors.push('Downtime cannot be negative');
        }

        const downtimeReasonLabel = String(entry.downtimeReasonLabel || '').trim();
        if (downtimeMinutes > 0 && !downtimeReasonLabel) {
          errors.push('Downtime Reason is required when downtime > 0');
        }
        if (downtimeMinutes > 0 && downtimeReasonLabel && !reasonMap.has(downtimeReasonLabel.toLowerCase())) {
          errors.push(`Downtime Reason "${downtimeReasonLabel}" not found`);
        }

        const resolvedMachine = machineNames.includes(machineName) ? machineName : machineName;
        const resolvedSection = getSectionForMachine(selectedPlant?.name || '', resolvedMachine) || '';
        const numberOfSettings = resolvedSection === 'Slitter' ? parseInt(String(entry.numberOfSettings || '0')) || 0 : 0;
        const numberOfCycles = resolvedSection === 'Metallizer' ? parseInt(String(entry.numberOfCycles || '0')) || 0 : 0;

        return {
          rowIndex: idx + 2,
          entryDate,
          shift,
          machineName,
          filmCodeName,
          productionTons,
          wasteTons,
          downtimeMinutes,
          downtimeReasonLabel,
          numberOfSettings,
          numberOfCycles,
          section: resolvedSection,
          valid: errors.length === 0,
          errors,
        };
      });

      setImportRows(parsedRows);
      setImportState('preview');
    } catch {
      setParseError('Failed to read the Excel file. Please ensure it is a valid .xlsx file.');
      setImportState('idle');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [machineNames, filmCodes, reasons, selectedPlant]);

  const handleImport = useCallback(async () => {
    const validRows = importRows.filter(r => r.valid);
    if (validRows.length === 0) return;

    setImportState('importing');
    setImportProgress({ current: 0, total: validRows.length });

    const filmCodeMap = new Map<string, FilmCode>();
    filmCodes.forEach(fc => filmCodeMap.set(fc.filmCodeName.toLowerCase(), fc));
    const reasonMap = new Map<string, DowntimeReason>();
    reasons.forEach(r => reasonMap.set(r.reasonLabel.toLowerCase(), r));

    const results: ImportResult = {
      totalRecords: importRows.length,
      successCount: 0,
      failCount: 0,
      failures: [],
    };

    const BATCH_SIZE = 10;
    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);
      const promises = batch.map(async (row) => {
        const fc = filmCodeMap.get(row.filmCodeName.toLowerCase());
        const dr = row.downtimeReasonLabel ? reasonMap.get(row.downtimeReasonLabel.toLowerCase()) : undefined;
        const wastePercent = row.productionTons > 0 ? (row.wasteTons / row.productionTons * 100) : 0;

        const payload = {
          entryDate: row.entryDate,
          shift: row.shift,
          plantId: selectedPlant?.id,
          plantName: selectedPlant?.name,
          section: row.section,
          machineId: null,
          machineName: row.machineName,
          filmCodeId: fc?.id || '',
          filmCodeName: fc?.filmCodeName || row.filmCodeName,
          productionTons: row.productionTons,
          wasteTons: row.wasteTons,
          wastePercent,
          downtimeMinutes: row.downtimeMinutes,
          downtimeReasonId: dr?.id || null,
          downtimeReasonLabel: dr?.reasonLabel || row.downtimeReasonLabel || null,
          numberOfSettings: row.numberOfSettings || null,
          numberOfCycles: row.numberOfCycles || null,
          createdByName: user?.name || '',
        };

        try {
          const res = await fetch('/api/production-entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const body = await res.json().catch(() => ({}));
          if (res.ok && body.ok !== false) {
            results.successCount++;
          } else {
            results.failCount++;
            results.failures.push({
              rowIndex: row.rowIndex,
              entryDate: row.entryDate,
              machine: row.machineName,
              reason: body.error?.message || `HTTP ${res.status}`,
            });
          }
        } catch {
          results.failCount++;
          results.failures.push({
            rowIndex: row.rowIndex,
            entryDate: row.entryDate,
            machine: row.machineName,
            reason: 'Network error',
          });
        }
      });

      await Promise.all(promises);
      setImportProgress({ current: Math.min(i + BATCH_SIZE, validRows.length), total: validRows.length });
    }

    setImportResult(results);
    setImportState('done');
    if (results.successCount > 0) onSuccess();
  }, [importRows, filmCodes, reasons, selectedPlant, user, onSuccess]);

  const validCount = importRows.filter(r => r.valid).length;
  const invalidCount = importRows.filter(r => !r.valid).length;

  return (
    <>
      <Button onClick={() => { resetDialog(); setShowDialog(true); }} variant="outline" className="border-slate-200">
        <Upload className="w-4 h-4 mr-1" /> Import Excel
      </Button>
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} />

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: plantColor + '15' }}>
                  <FileSpreadsheet className="w-5 h-5" style={{ color: plantColor }} />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">Import Production Data from Excel</h2>
                  <p className="text-xs text-slate-500">Upload .xlsx file with historical production records</p>
                </div>
              </div>
              <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto px-6 py-4">
              {/* IDLE STATE — Upload prompt */}
              {importState === 'idle' && !parseError && (
                <div className="text-center py-12">
                  <div className="mx-auto w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <Upload className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-lg text-slate-800 mb-2">Select your Excel file</h3>
                  <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                    Upload an .xlsx file containing production data. Columns will be automatically mapped.
                  </p>
                  <Button onClick={() => fileInputRef.current?.click()} style={{ backgroundColor: plantColor }} className="text-white">
                    <Upload className="w-4 h-4 mr-2" /> Choose Excel File
                  </Button>
                  <div className="mt-8 max-w-lg mx-auto">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Expected Excel Columns</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-left">
                      {['Date', 'Shift', 'Plant', 'Section', 'Machine', 'Film Code', 'Production (Tons)', 'Waste (Tons)', 'Downtime (Min)', 'Downtime Reason'].map(col => (
                        <div key={col} className="px-3 py-2 bg-slate-50 rounded-lg text-xs text-slate-600">
                          {col}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-3">
                      Only Machine, Film Code, Production (Tons), and Shift are strictly required.
                      Plant and Section columns are optional — the selected plant is used automatically.
                      Column matching is case-insensitive.
                    </p>
                  </div>
                  <div className="mt-6">
                    <Button variant="outline" size="sm" onClick={() => {
                      const sampleHeaders = 'Date,Shift,Plant,Section,Machine,Film Code,Production (Tons),Waste (Tons),Downtime (Min),Downtime Reason';
                      const sampleRows = [
                        '2025-01-15,Morning,IPAK,Film Line,Film Line,PP-100,45.5,2.1,0,',
                        '2025-01-15,Morning,IPAK,Slitter,Primary Slitter,PP-100,12.3,0.5,30,Mechanical',
                        '2025-01-15,Morning,IPAK,Metallizer,Metallizer,MET-200,8.2,0.3,45,Electrical',
                      ];
                      const csv = [sampleHeaders, ...sampleRows].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = 'production-import-template.csv'; a.click();
                      URL.revokeObjectURL(url);
                    }}>
                      <Download className="w-3.5 h-3.5 mr-1" /> Download Template
                    </Button>
                  </div>
                </div>
              )}

              {/* PARSING STATE */}
              {importState === 'parsing' && (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-4" style={{ borderColor: plantColor }} />
                  <p className="text-sm text-slate-600">Reading and validating Excel file...</p>
                </div>
              )}

              {/* PARSE ERROR */}
              {parseError && (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-red-700 mb-2">Import Error</h3>
                  <p className="text-sm text-red-600 mb-4">{parseError}</p>
                  <Button variant="outline" onClick={() => { setParseError(''); setImportState('idle'); }}>Try Again</Button>
                </div>
              )}

              {/* PREVIEW STATE */}
              {importState === 'preview' && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-slate-800">{importRows.length}</p>
                      <p className="text-xs text-slate-500">Total Records</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">{validCount}</p>
                      <p className="text-xs text-slate-500">Valid Records</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-600">{invalidCount}</p>
                      <p className="text-xs text-slate-500">Invalid Records</p>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="overflow-auto max-h-[40vh]">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-slate-500">Row</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-500">Status</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-500">Date</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-500">Shift</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-500">Machine</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-500">Film Code</th>
                            <th className="px-3 py-2 text-right font-medium text-slate-500">Prod (T)</th>
                            <th className="px-3 py-2 text-right font-medium text-slate-500">Waste (T)</th>
                            <th className="px-3 py-2 text-right font-medium text-slate-500">DT (Min)</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-500">Errors</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importRows.map(row => (
                            <tr key={row.rowIndex} className={`border-t border-slate-100 ${row.valid ? '' : 'bg-red-50/50'}`}>
                              <td className="px-3 py-2 text-slate-500">{row.rowIndex}</td>
                              <td className="px-3 py-2">
                                {row.valid ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                                )}
                              </td>
                              <td className="px-3 py-2">{row.entryDate}</td>
                              <td className="px-3 py-2">{row.shift}</td>
                              <td className="px-3 py-2">{row.machineName}</td>
                              <td className="px-3 py-2">{row.filmCodeName}</td>
                              <td className="px-3 py-2 text-right">{row.productionTons.toFixed(1)}</td>
                              <td className="px-3 py-2 text-right">{row.wasteTons.toFixed(1)}</td>
                              <td className="px-3 py-2 text-right">{row.downtimeMinutes}</td>
                              <td className="px-3 py-2">
                                {row.errors.length > 0 && (
                                  <span className="text-red-600">{row.errors.join('; ')}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* IMPORTING STATE */}
              {importState === 'importing' && (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-4" style={{ borderColor: plantColor }} />
                  <p className="text-sm text-slate-600 font-medium">
                    Importing... {importProgress.current}/{importProgress.total}
                  </p>
                  <div className="mt-4 max-w-xs mx-auto bg-slate-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: plantColor,
                        width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* DONE STATE */}
              {importState === 'done' && importResult && (
                <div className="space-y-4">
                  <div className="text-center py-6">
                    {importResult.failCount === 0 ? (
                      <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
                    ) : (
                      <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-3" />
                    )}
                    <h3 className="font-semibold text-lg text-slate-800 mb-1">Import Complete</h3>
                  </div>

                  <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-slate-800">{importResult.totalRecords}</p>
                      <p className="text-xs text-slate-500">Total</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">{importResult.successCount}</p>
                      <p className="text-xs text-slate-500">Imported</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-600">{importResult.failCount}</p>
                      <p className="text-xs text-slate-500">Failed</p>
                    </div>
                  </div>

                  {importResult.failures.length > 0 && (
                    <div className="border border-red-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-2 bg-red-50 border-b border-red-200">
                        <h4 className="text-sm font-semibold text-red-700">Failed Records</h4>
                      </div>
                      <div className="overflow-auto max-h-48">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-100">
                              <th className="px-3 py-2 text-left font-medium text-slate-500">Row</th>
                              <th className="px-3 py-2 text-left font-medium text-slate-500">Date</th>
                              <th className="px-3 py-2 text-left font-medium text-slate-500">Machine</th>
                              <th className="px-3 py-2 text-left font-medium text-slate-500">Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importResult.failures.map((f, i) => (
                              <tr key={i} className="border-b border-slate-100">
                                <td className="px-3 py-2">{f.rowIndex}</td>
                                <td className="px-3 py-2">{f.entryDate}</td>
                                <td className="px-3 py-2">{f.machine}</td>
                                <td className="px-3 py-2 text-red-600">{f.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center">
              <div>
                {importState === 'preview' && (
                  <p className="text-xs text-slate-500">
                    {validCount} valid record{validCount !== 1 ? 's' : ''} will be imported.
                    {invalidCount > 0 && ` ${invalidCount} invalid record${invalidCount !== 1 ? 's' : ''} will be skipped.`}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  {importState === 'done' ? 'Close' : 'Cancel'}
                </Button>
                {importState === 'idle' && (
                  <Button onClick={() => fileInputRef.current?.click()} style={{ backgroundColor: plantColor }} className="text-white">
                    <Upload className="w-4 h-4 mr-1" /> Select File
                  </Button>
                )}
                {importState === 'preview' && validCount > 0 && (
                  <Button onClick={handleImport} style={{ backgroundColor: plantColor }} className="text-white">
                    <Check className="w-4 h-4 mr-1" /> Import {validCount} Record{validCount !== 1 ? 's' : ''}
                  </Button>
                )}
                {importState === 'done' && importResult && importResult.failCount > 0 && (
                  <Button variant="outline" onClick={() => { resetDialog(); setImportState('idle'); }}>
                    Import More
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
