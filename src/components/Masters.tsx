import React, { useEffect, useState } from 'react';
import { usePlant } from '@/lib/PlantContext';
import { useAuth } from '@/lib/AuthContext';
import { SECTIONS } from '@/lib/plantConfig';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Check, ToggleLeft, ToggleRight, Upload, FileText, Pencil, Trash2 } from 'lucide-react';

type MasterType = 'film-codes' | 'downtime-reasons' | 'machines';

interface MasterItem {
  id: string; status: string;
  filmCodeName?: string; reasonLabel?: string; machineName?: string;
  plantName?: string; section?: string; description?: string;
}

const TABS: { key: MasterType; label: string; field: string }[] = [
  { key: 'film-codes', label: 'Film Codes', field: 'filmCodeName' },
  { key: 'downtime-reasons', label: 'Downtime Reasons', field: 'reasonLabel' },
  { key: 'machines', label: 'Machines', field: 'machineName' },
];

export default function Masters() {
  const { selectedPlant } = usePlant();
  const { user, hasPermission } = useAuth();
  const canAdd = user?.role === 'admin' || hasPermission('masters.create');
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState<MasterType>('film-codes');
  const [items, setItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [form, setForm] = useState({ name: '', section: '', description: '' });

  const [showUpload, setShowUpload] = useState(false);
  const [uploadMode, setUploadMode] = useState<'paste' | 'file'>('paste');
  const [uploadText, setUploadText] = useState('');
  const [uploadResults, setUploadResults] = useState<{ created: number; skipped: { index: number; name: string; reason: string }[]; total: number } | null>(null);
  const [uploading, setUploading] = useState(false);

  const plantColor = selectedPlant?.color || '#16a34a';
  const [editingItem, setEditingItem] = useState<MasterItem | null>(null);
  const [editForm, setEditForm] = useState({ name: '', section: '', description: '' });
  const [deletingItem, setDeletingItem] = useState<MasterItem | null>(null);

  const currentTab = TABS.find(t => t.key === activeTab)!;

  const fetchItems = async () => {
    setLoading(true);
    try {
      let url = `/api/${activeTab}`;
      if (activeTab === 'film-codes') {
        url = `/api/film-codes-filtered${selectedPlant?.id ? `?plantId=${selectedPlant.id}` : ''}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setItems(data.items || data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
    setShowForm(false);
    setShowUpload(false);
    setUploadResults(null);
    setForm({ name: '', section: '', description: '' });
  }, [activeTab, selectedPlant?.id]);

  const handleSave = async () => {
    if (!form.name) return;
    const payload: Record<string, unknown> = {};
    payload[currentTab.field] = form.name;
    if (activeTab === 'machines') {
      payload.plantId = selectedPlant?.id;
      payload.plantName = selectedPlant?.name;
      payload.section = form.section;
    }
    if (activeTab === 'film-codes') {
      payload.description = form.description;
      payload.plantId = selectedPlant?.id;
      payload.plantName = selectedPlant?.name;
    }

    await fetch(`/api/${activeTab}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSuccessMsg('✅ Saved');
    setTimeout(() => { setSuccessMsg(''); setShowForm(false); }, 2000);
    setForm({ name: '', section: '', description: '' });
    fetchItems();
  };

  const toggleStatus = async (item: MasterItem) => {
    const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    await fetch(`/api/${activeTab}/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchItems();
  };

  const startEdit = (item: MasterItem) => {
    setEditingItem(item);
    setEditForm({
      name: item.filmCodeName || item.reasonLabel || item.machineName || '',
      section: item.section || '',
      description: item.description || '',
    });
  };

  const handleEdit = async () => {
    if (!editingItem || !editForm.name) return;
    const payload: Record<string, unknown> = {};
    payload[currentTab.field] = editForm.name;
    if (activeTab === 'machines') payload.section = editForm.section;
    if (activeTab === 'film-codes') payload.description = editForm.description;
    await fetch(`/api/${activeTab}/${editingItem.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setEditingItem(null);
    setSuccessMsg('✅ Updated');
    setTimeout(() => setSuccessMsg(''), 2000);
    fetchItems();
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    await fetch(`/api/${activeTab}/${deletingItem.id}`, { method: 'DELETE' });
    setDeletingItem(null);
    setSuccessMsg('✅ Deleted');
    setTimeout(() => setSuccessMsg(''), 2000);
    fetchItems();
  };

  const handleBulkUpload = async () => {
    const lines = uploadText.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) return;
    setUploading(true);
    try {
      const itemsPayload = lines.map(line => {
        const cols = line.split('\t');
        const name = (cols[0] || '').trim();
        const desc = (cols[1] || '').trim();
        return { filmCodeName: name, description: desc || undefined };
      });
      const res = await fetch('/api/film-codes/bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsPayload,
          plantId: selectedPlant?.id || null,
          plantName: selectedPlant?.name || null,
        }),
      });
      const body = await res.json();
      setUploadResults(body);
      if (body.created > 0) fetchItems();
    } catch {
      alert('Upload failed.');
    }
    setUploading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    setUploadText(lines.join('\n'));
    setUploadMode('paste');
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Masters</h1>
        <p className="text-sm text-slate-500">Manage master data{selectedPlant ? ` — ${selectedPlant.name}` : ''}</p>
      </div>

      {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg">{successMsg}</div>}

      <div className="flex gap-1 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${activeTab === tab.key ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            style={activeTab === tab.key ? { backgroundColor: plantColor } : {}}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{items.length} records {selectedPlant && activeTab === 'film-codes' ? `(filtered by ${selectedPlant.name})` : ''}</p>
        <div className="flex gap-2">
          {canAdd && activeTab === 'film-codes' && (
            <Button onClick={() => { setShowUpload(true); setShowForm(false); setUploadResults(null); setUploadText(''); setUploadMode('paste') }}
              variant="outline" className="border-slate-300">
              <Upload className="w-4 h-4 mr-1" /> Upload Excel
            </Button>
          )}
          {canAdd && (
            <Button onClick={() => { setShowForm(true); setShowUpload(false); setForm({ name: '', section: '', description: '' }) }}
              style={{ backgroundColor: plantColor }} className="text-white">
              <Plus className="w-4 h-4 mr-1" /> Add {currentTab.label.replace(/s$/, '')}
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Add {currentTab.label.replace(/s$/, '')}</h3>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Name *</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Enter name" />
            </div>
            {activeTab === 'machines' && (
              <div>
                <label className="text-xs font-medium text-slate-600">Section *</label>
                <select value={form.section} onChange={e => setForm({ ...form, section: e.target.value })}
                  className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
                  <option value="">Select section</option>
                  {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            {activeTab === 'film-codes' && (
              <div>
                <label className="text-xs font-medium text-slate-600">Description</label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
              </div>
            )}
            <div className="flex items-end">
              <Button onClick={handleSave} style={{ backgroundColor: plantColor }} className="text-white"><Check className="w-4 h-4 mr-1" /> Save</Button>
            </div>
          </div>
        </Card>
      )}

      {showUpload && (
        <Card className="p-4 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm">Upload Film Codes{selectedPlant ? ` for ${selectedPlant.name}` : ''}</h3>
              <p className="text-xs text-slate-500">Paste from Excel or upload a .txt/.csv file. Duplicates within this plant will be skipped.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setUploadMode(uploadMode === 'paste' ? 'file' : 'paste')}>
                {uploadMode === 'paste' ? <><FileText className="w-3.5 h-3.5 mr-1" /> Upload File</> : <><Upload className="w-3.5 h-3.5 mr-1" /> Paste Text</>}
              </Button>
              <button onClick={() => setShowUpload(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {uploadMode === 'paste' ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">One film code per line. Tab-separated: <strong>Film Code Name</strong> (required) + <strong>Description</strong> (optional)</p>
              <textarea
                value={uploadText}
                onChange={e => setUploadText(e.target.value)}
                placeholder={"THO30\nTHO25\tStandard film\nTHO18\nPP-200\tPolypropylene"}
                className="w-full h-40 p-3 text-xs font-mono border border-slate-200 rounded-lg bg-white resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => { setShowUpload(false); setUploadText(''); setUploadResults(null) }}>Cancel</Button>
                <Button size="sm" onClick={handleBulkUpload} disabled={uploading || !uploadText.trim()}
                  style={{ backgroundColor: plantColor }} className="text-white">
                  <Check className="w-3.5 h-3.5 mr-1" /> {uploading ? 'Uploading...' : `Upload (${uploadText.trim().split('\n').filter(l => l.trim()).length} codes)`}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">Upload a .txt or .csv file — one film code per line.</p>
              <input type="file" accept=".txt,.csv" onChange={handleFileUpload}
                className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>
          )}

          {uploadResults && (
            <div className={`mt-3 p-3 rounded-lg text-sm ${uploadResults.skipped.length > 0 && uploadResults.created === 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
              <p className="font-medium">{uploadResults.created} of {uploadResults.total} film codes saved successfully.</p>
              {uploadResults.skipped.length > 0 && (
                <ul className="mt-1 text-xs text-amber-600 space-y-0.5">
                  {uploadResults.skipped.map((s, i) => <li key={i}>Row {s.index + 1}: <strong>{s.name || '(empty)'}</strong> — {s.reason}</li>)}
                </ul>
              )}
            </div>
          )}
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left p-3 text-xs font-medium text-slate-500">Name</th>
                {activeTab === 'film-codes' && <th className="text-left p-3 text-xs font-medium text-slate-500">Plant</th>}
                {activeTab === 'machines' && <th className="text-left p-3 text-xs font-medium text-slate-500">Section</th>}
                <th className="text-left p-3 text-xs font-medium text-slate-500">Status</th>
                {isAdmin && <th className="text-center p-3 text-xs font-medium text-slate-500">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">
                  {activeTab === 'film-codes' && selectedPlant ? `No film codes for ${selectedPlant.name}. Click "Add" or "Upload Excel" to get started.` : 'No records.'}
                </td></tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-medium">{item.filmCodeName || item.reasonLabel || item.machineName}</td>
                    {activeTab === 'film-codes' && <td className="p-3 text-xs text-slate-500">{item.plantName || 'All Plants'}</td>}
                    {activeTab === 'machines' && <td className="p-3">{item.section}</td>}
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {item.status}
                      </span>
                    </td>
                    {isAdmin && (
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => startEdit(item)} title="Edit" className="p-1 hover:bg-blue-50 rounded text-blue-500 hover:text-blue-700">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleStatus(item)} title={item.status === 'Active' ? 'Deactivate' : 'Activate'} className="p-1 hover:bg-slate-100 rounded">
                          {item.status === 'Active' ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                        </button>
                        <button onClick={() => setDeletingItem(item)} title="Delete" className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ═══ EDIT MODAL ═══ */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">Edit {currentTab.label.replace(/s$/, '')}</h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Name *</label>
                <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              {activeTab === 'machines' && (
                <div>
                  <label className="text-xs font-medium text-slate-600">Section *</label>
                  <select value={editForm.section} onChange={e => setEditForm({ ...editForm, section: e.target.value })}
                    className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
                    <option value="">Select section</option>
                    {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              {activeTab === 'film-codes' && (
                <div>
                  <label className="text-xs font-medium text-slate-600">Description</label>
                  <Input value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
              <Button onClick={handleEdit} style={{ backgroundColor: plantColor }} className="text-white"><Check className="w-4 h-4 mr-1" /> Update</Button>
            </div>
          </Card>
        </div>
      )}

      {/* ═══ DELETE CONFIRMATION ═══ */}
      {deletingItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm p-5 space-y-4">
            <h3 className="font-semibold text-base">Delete Confirmation</h3>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <strong>{deletingItem.filmCodeName || deletingItem.reasonLabel || deletingItem.machineName}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeletingItem(null)}>Cancel</Button>
              <Button onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700"><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
