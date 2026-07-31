import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { usePlant } from '@/lib/PlantContext'
import { useAuth } from '@/lib/AuthContext'
import { PLANTS } from '@/lib/plantConfig'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Plus, X, Check, Trash2, Truck, Search, ArrowUpDown, ArrowUp, ArrowDown,
  Download, FileText, Printer, Edit,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import { CHART_COLORS } from '@/lib/plantConfig'

import { getPlantConfig } from '@/lib/plantConfig'

interface Customer { id: string; name: string; plantName: string | null }

interface DispatchRow {
  id: string; dispatchDate: string; customerName: string; filmCodeId: string;
  filmCodeName: string; quantityTons: number; dispatchType: string;
  plantId: string; plantName: string; createdByName?: string;
}

interface FilmCode { id: string; filmCodeName: string; status: string }

export default function Dispatch({ initialParams }: { initialParams?: Record<string, string> }) {
  const { selectedPlant } = usePlant()
  const { user, hasPermission } = useAuth()
  const plantColor = selectedPlant?.color || '#16a34a'

  const canView = user?.role === 'admin' || hasPermission('dispatch.view')
  const canAdd = user?.role === 'admin' || hasPermission('dispatch.create')
  const canEdit = user?.role === 'admin' || hasPermission('dispatch.edit')
  const canDelete = user?.role === 'admin' || hasPermission('dispatch.delete')
  const canExport = user?.role === 'admin' || hasPermission('dispatch.export')

  const [filmCodes, setFilmCodes] = useState<FilmCode[]>([])
  const [successMsg, setSuccessMsg] = useState('')
  const defaultTab = initialParams?.tab || 'entry'

  useEffect(() => {
    fetch('/api/film-codes')
      .then(r => r.json())
      .then(d => setFilmCodes((d.items || []).filter((f: FilmCode) => f.status === 'Active')))
      .catch(() => {})
  }, [])

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 2500)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-6 h-6" style={{ color: plantColor }} /> Dispatch
          </h1>
          <p className="text-sm text-slate-500">{selectedPlant?.name} — Manage dispatch records</p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4" /> {successMsg}
        </div>
      )}

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="entry">Dispatch Entry</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="entry">
          <DispatchEntry
            plantColor={plantColor} filmCodes={filmCodes} canAdd={canAdd} canEdit={canEdit} canDelete={canDelete}
            onSaved={() => showSuccess('✅ Dispatch saved')} onDeleted={() => showSuccess('✅ Dispatch deleted')}
          />
        </TabsContent>

        <TabsContent value="reports">
          <DispatchReports
            plantColor={plantColor} filmCodes={filmCodes} canExport={canExport}
            onAction={() => showSuccess('✅ Done')} initialParams={initialParams}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <DispatchAnalytics plantColor={plantColor} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   DISPATCH ENTRY
   ═══════════════════════════════════════════════════════════════ */
function DispatchEntry({
  plantColor, filmCodes, canAdd, canEdit, canDelete, onSaved, onDeleted,
}: {
  plantColor: string; filmCodes: FilmCode[]; canAdd: boolean; canEdit: boolean; canDelete: boolean;
  onSaved: () => void; onDeleted: () => void;
}) {
  const { selectedPlant } = usePlant()
  const { user } = useAuth()
  const [entries, setEntries] = useState<DispatchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editRow, setEditRow] = useState<DispatchRow | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [addingCustomer, setAddingCustomer] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkRows, setBulkRows] = useState<Array<{
    dispatchDate: string; customerName: string; filmCodeId: string; filmCodeName: string;
    quantityTons: string; dispatchType: string;
  }>>([])
  const [bulkResults, setBulkResults] = useState<{ created: number; errors: Array<{ index: number; error: string }>; total: number } | null>(null)
  const [bulkPasteMode, setBulkPasteMode] = useState(false)
  const [bulkPasteText, setBulkPasteText] = useState('')

  const emptyForm = {
    dispatchDate: new Date().toISOString().split('T')[0],
    customerName: '', filmCodeId: '', filmCodeName: '',
    quantityTons: '', dispatchType: 'Local',
  }
  const [form, setForm] = useState(emptyForm)

  const fetchData = useCallback(async () => {
    if (!selectedPlant) return
    setLoading(true)
    try {
      const [eqRes, custRes] = await Promise.all([
        fetch(`/api/dispatches?plantName=${selectedPlant.name}`),
        fetch(`/api/customer-list?plant=${selectedPlant.name}`),
      ])
      const d = await eqRes.json()
      setEntries(d.items || d.data || [])
      const c = await custRes.json()
      setCustomers(c.items || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [selectedPlant])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async () => {
    if (!form.customerName || !form.filmCodeId || !form.quantityTons) return
    const fc = filmCodes.find(f => f.id === form.filmCodeId)
    const payload = {
      dispatchDate: form.dispatchDate,
      customerName: form.customerName,
      filmCodeId: form.filmCodeId,
      filmCodeName: fc?.filmCodeName || form.filmCodeName,
      quantityTons: parseFloat(form.quantityTons),
      dispatchType: form.dispatchType,
      plantId: selectedPlant?.id,
      plantName: selectedPlant?.name,
      createdByName: user?.name || '',
    }

    if (editRow) {
      const res = await fetch(`/api/dispatches/${editRow.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.ok) { alert(body.error?.message || 'Update failed'); return }
    } else {
      const res = await fetch('/api/dispatches', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.ok) { alert(body.error?.message || 'Save failed'); return }
    }
    setShowForm(false)
    setEditRow(null)
    setForm(emptyForm)
    fetchData()
    onSaved()
  }

  const handleEdit = (row: DispatchRow) => {
    setEditRow(row)
    setForm({
      dispatchDate: row.dispatchDate,
      customerName: row.customerName,
      filmCodeId: row.filmCodeId,
      filmCodeName: row.filmCodeName,
      quantityTons: String(row.quantityTons),
      dispatchType: row.dispatchType,
    })
    setCustomerSearch(row.customerName)
    setShowForm(true)
  }

  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) return
    setAddingCustomer(true)
    try {
      const res = await fetch('/api/customer-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCustomerName.trim(), plantId: selectedPlant?.id, plantName: selectedPlant?.name }),
      })
        const body = await res.json()
        if (body.ok) {
          setForm({ ...form, customerName: body.customer.name })
          setCustomerSearch(body.customer.name)
          setShowAddCustomer(false)
          setNewCustomerName('')
          fetchData()
          onSaved()
        } else {
        alert(body.error || 'Failed to add customer')
      }
    } catch { alert('Failed to add customer') }
    setAddingCustomer(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this dispatch record?')) return
    const res = await fetch(`/api/dispatches/${id}`, { method: 'DELETE' })
    if (res.ok) { fetchData(); onDeleted() }
  }

  const filteredCustomers = customerSearch
    ? customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) && c.name !== form.customerName)
    : []

  const totalTons = useMemo(() => entries.reduce((s, e) => s + e.quantityTons, 0), [entries])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Dispatch Entries</h2>
          <p className="text-sm text-slate-500">Total: <strong>{entries.length}</strong> records · <strong>{totalTons.toFixed(1)}</strong> Tons</p>
        </div>
        {canAdd && (
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowAddCustomer(true)} variant="outline" className="border-slate-300">
              <Plus className="w-4 h-4 mr-1" /> Add Customer
            </Button>
            <Button onClick={() => { setShowForm(true); setEditRow(null); setForm(emptyForm); setCustomerSearch('') }}
              style={{ backgroundColor: plantColor }} className="text-white">
              <Plus className="w-4 h-4 mr-1" /> Add New Dispatch
            </Button>
            <Button onClick={() => {
              setBulkMode(true); setBulkResults(null); setBulkPasteMode(false); setBulkPasteText('')
              const today = new Date().toISOString().split('T')[0]
              setBulkRows(Array.from({ length: 5 }, () => ({
                dispatchDate: today, customerName: '', filmCodeId: '', filmCodeName: '',
                quantityTons: '', dispatchType: 'Local',
              })))
            }} variant="outline" className="border-slate-300">
              <FileText className="w-4 h-4 mr-1" /> Bulk Entry
            </Button>
          </div>
        )}
      </div>

      {showForm && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">{editRow ? 'Edit Dispatch' : 'Add New Dispatch'}</h3>
            <button onClick={() => { setShowForm(false); setEditRow(null) }} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Date *</label>
              <Input type="date" value={form.dispatchDate} onChange={e => setForm({ ...form, dispatchDate: e.target.value })} />
            </div>
            <div className="relative">
              <label className="text-xs font-medium text-slate-600">Customer *</label>
              <Input
                value={customerSearch}
                onChange={e => {
                  setCustomerSearch(e.target.value)
                  setForm({ ...form, customerName: '' })
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Type to search customer..."
              />
              {showSuggestions && filteredCustomers.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {filteredCustomers.slice(0, 10).map(c => (
                    <button key={c.id}
                      onMouseDown={() => { setCustomerSearch(c.name); setForm({ ...form, customerName: c.name }); setShowSuggestions(false) }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                    >{c.name}</button>
                  ))}
                </div>
              )}
              {showSuggestions && filteredCustomers.length === 0 && customerSearch && !form.customerName && (
                <div className="absolute z-10 top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg">
                  <div className="px-3 py-2 text-sm text-slate-500">
                    No customer found.{' '}
                    <button onMouseDown={() => { setNewCustomerName(customerSearch); setShowAddCustomer(true); setShowSuggestions(false) }}
                      className="text-blue-600 font-medium hover:underline">Add new?</button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Film Code *</label>
              <select value={form.filmCodeId}
                onChange={e => setForm({ ...form, filmCodeId: e.target.value })}
                className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
                <option value="">Select film</option>
                {filmCodes.map(f => <option key={f.id} value={f.id}>{f.filmCodeName}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Quantity (Tons) *</label>
              <Input type="number" min="0" step="0.01" value={form.quantityTons}
                onChange={e => setForm({ ...form, quantityTons: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Dispatch Type *</label>
              <select value={form.dispatchType}
                onChange={e => setForm({ ...form, dispatchType: e.target.value })}
                className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
                <option value="Local">Local</option>
                <option value="Export">Export</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <Button onClick={handleSave} style={{ backgroundColor: plantColor }} className="text-white">
              <Check className="w-4 h-4 mr-1" /> {editRow ? 'Update' : 'Save'}
            </Button>
          </div>
        </Card>
      )}

      {/* ═══ BULK ENTRY ═══ */}
      {bulkMode && (
        <Card className="p-4 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm">Bulk Dispatch Entry</h3>
              <p className="text-xs text-slate-500">Add multiple dispatch records at once. Fill all rows and click Save All.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setBulkPasteMode(!bulkPasteMode)}>
                {bulkPasteMode ? '📋 Table View' : '📋 Paste from Excel'}
              </Button>
              <button onClick={() => setBulkMode(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {bulkPasteMode ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">Paste tab-separated data from Excel/Google Sheets. Columns: <strong>Date, Customer, Film Code Name, Quantity, Type (Local/Export)</strong></p>
              <textarea
                value={bulkPasteText}
                onChange={e => setBulkPasteText(e.target.value)}
                placeholder={`2026-07-28\tCustomer A\tFilm-1\t12.5\tLocal\n2026-07-28\tCustomer B\tFilm-2\t8.0\tExport`}
                className="w-full h-40 p-3 text-xs font-mono border border-slate-200 rounded-lg bg-white resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => { setBulkPasteMode(false); setBulkPasteText('') }}>Cancel</Button>
                <Button size="sm" onClick={() => {
                  const lines = bulkPasteText.trim().split('\n').filter(l => l.trim())
                  const today = new Date().toISOString().split('T')[0]
                  const parsed = lines.map(line => {
                    const cols = line.split('\t')
                    const filmMatch = filmCodes.find(f => f.filmCodeName.toLowerCase().trim() === (cols[2] || '').toLowerCase().trim())
                    return {
                      dispatchDate: cols[0]?.trim() || today,
                      customerName: cols[1]?.trim() || '',
                      filmCodeId: filmMatch?.id || '',
                      filmCodeName: filmMatch?.filmCodeName || cols[2]?.trim() || '',
                      quantityTons: cols[3]?.trim() || '',
                      dispatchType: (cols[4]?.trim() || 'Local') === 'Export' ? 'Export' : 'Local',
                    }
                  })
                  setBulkRows(parsed.length > 0 ? parsed : [])
                  setBulkPasteMode(false)
                  setBulkPasteText('')
                }} className="bg-blue-600 text-white">Parse & Load</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="p-2 text-left text-slate-500 w-8">#</th>
                      <th className="p-2 text-left text-slate-500">Date</th>
                      <th className="p-2 text-left text-slate-500">Customer</th>
                      <th className="p-2 text-left text-slate-500">Film Code</th>
                      <th className="p-2 text-right text-slate-500">Qty (T)</th>
                      <th className="p-2 text-center text-slate-500">Type</th>
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-blue-50/30">
                        <td className="p-1 text-slate-400 text-center">{idx + 1}</td>
                        <td className="p-1">
                          <input type="date" value={row.dispatchDate}
                            onChange={e => {
                              const updated = [...bulkRows]; updated[idx] = { ...updated[idx], dispatchDate: e.target.value }; setBulkRows(updated)
                            }}
                            className="w-full h-7 px-1 text-xs border border-slate-200 rounded bg-white" />
                        </td>
                        <td className="p-1">
                          <input value={row.customerName} placeholder="Customer"
                            onChange={e => {
                              const updated = [...bulkRows]; updated[idx] = { ...updated[idx], customerName: e.target.value }; setBulkRows(updated)
                            }}
                            className="w-full h-7 px-1 text-xs border border-slate-200 rounded bg-white" />
                        </td>
                        <td className="p-1">
                          <select value={row.filmCodeId}
                            onChange={e => {
                              const fc = filmCodes.find(f => f.id === e.target.value)
                              const updated = [...bulkRows]; updated[idx] = { ...updated[idx], filmCodeId: e.target.value, filmCodeName: fc?.filmCodeName || '' }; setBulkRows(updated)
                            }}
                            className="w-full h-7 px-1 text-xs border border-slate-200 rounded bg-white">
                            <option value="">Select</option>
                            {filmCodes.map(f => <option key={f.id} value={f.id}>{f.filmCodeName}</option>)}
                          </select>
                        </td>
                        <td className="p-1">
                          <input type="number" min="0" step="0.01" value={row.quantityTons} placeholder="0"
                            onChange={e => {
                              const updated = [...bulkRows]; updated[idx] = { ...updated[idx], quantityTons: e.target.value }; setBulkRows(updated)
                            }}
                            className="w-full h-7 px-1 text-xs border border-slate-200 rounded bg-white text-right" />
                        </td>
                        <td className="p-1 text-center">
                          <select value={row.dispatchType}
                            onChange={e => {
                              const updated = [...bulkRows]; updated[idx] = { ...updated[idx], dispatchType: e.target.value }; setBulkRows(updated)
                            }}
                            className="h-7 px-1 text-xs border border-slate-200 rounded bg-white">
                            <option value="Local">Local</option>
                            <option value="Export">Export</option>
                          </select>
                        </td>
                        <td className="p-1 text-center">
                          <button onClick={() => setBulkRows(bulkRows.filter((_, i) => i !== idx))}
                            className="p-0.5 text-red-400 hover:text-red-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => {
                  const today = new Date().toISOString().split('T')[0]
                  setBulkRows([...bulkRows, { dispatchDate: today, customerName: '', filmCodeId: '', filmCodeName: '', quantityTons: '', dispatchType: 'Local' }])
                }}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{bulkRows.length} rows</span>
                  <Button onClick={async () => {
                    const valid = bulkRows.filter(r => r.customerName && r.filmCodeId && r.quantityTons)
                    if (valid.length === 0) { alert('Please fill at least one complete row.'); return }
                    setBulkSaving(true)
                    try {
                      const res = await fetch('/api/dispatch/bulk', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          items: valid, plantId: selectedPlant?.id, plantName: selectedPlant?.name, createdByName: user?.name || '',
                        }),
                      })
                      const body = await res.json()
                      setBulkResults(body)
                      if (body.created > 0) { fetchData(); onSaved() }
                    } catch { alert('Bulk save failed.') }
                    setBulkSaving(false)
                  }} disabled={bulkSaving}
                    style={{ backgroundColor: plantColor }} className="text-white">
                    <Check className="w-4 h-4 mr-1" /> {bulkSaving ? 'Saving...' : `Save All (${bulkRows.filter(r => r.customerName && r.filmCodeId && r.quantityTons).length})`}
                  </Button>
                </div>
              </div>

              {bulkResults && (
                <div className={`p-3 rounded-lg text-sm ${bulkResults.errors.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                  <p className="font-medium">{bulkResults.created} of {bulkResults.total} saved successfully.</p>
                  {bulkResults.errors.length > 0 && (
                    <ul className="mt-1 text-xs text-red-600 space-y-0.5">
                      {bulkResults.errors.map((e, i) => <li key={i}>{e.error}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left p-3 text-xs font-medium text-slate-500">Date</th>
                <th className="text-left p-3 text-xs font-medium text-slate-500">Customer</th>
                <th className="text-left p-3 text-xs font-medium text-slate-500">Film Code</th>
                <th className="text-right p-3 text-xs font-medium text-slate-500">Quantity (T)</th>
                <th className="text-center p-3 text-xs font-medium text-slate-500">Type</th>
                {(canEdit || canDelete) && <th className="text-center p-3 text-xs font-medium text-slate-500">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Loading...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">No dispatch records yet.</td></tr>
              ) : (
                entries.slice(0, 200).map(e => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3">{e.dispatchDate}</td>
                    <td className="p-3 font-medium">{e.customerName}</td>
                    <td className="p-3">{e.filmCodeName}</td>
                    <td className="p-3 text-right font-medium">{e.quantityTons.toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <Badge variant={e.dispatchType === 'Export' ? 'default' : 'secondary'} className="text-xs">
                        {e.dispatchType}
                      </Badge>
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="p-3 text-center space-x-1">
                        {canEdit && (
                          <button onClick={() => handleEdit(e)} className="p-1 hover:bg-blue-50 rounded">
                            <Edit className="w-3.5 h-3.5 text-blue-400" />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDelete(e.id)} className="p-1 hover:bg-red-50 rounded">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showAddCustomer && (
        <Card className="p-4 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Add New Customer</h3>
            <button onClick={() => { setShowAddCustomer(false); setNewCustomerName('') }} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-600">Customer Name *</label>
              <Input
                value={newCustomerName}
                onChange={e => setNewCustomerName(e.target.value)}
                placeholder="Enter customer name"
                onKeyDown={e => { if (e.key === 'Enter') handleAddCustomer() }}
                autoFocus
              />
            </div>
            <Button onClick={handleAddCustomer} disabled={addingCustomer || !newCustomerName.trim()}
              className="bg-blue-600 text-white">
              <Check className="w-4 h-4 mr-1" /> {addingCustomer ? 'Adding...' : 'Add Customer'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   DISPATCH REPORTS
   ═══════════════════════════════════════════════════════════════ */
function DispatchReports({
  plantColor, filmCodes, canExport, onAction, initialParams,
}: {
  plantColor: string; filmCodes: FilmCode[]; canExport: boolean; onAction: () => void; initialParams?: Record<string, string>;
}) {
  const { selectedPlant } = usePlant()
  const [data, setData] = useState<DispatchRow[]>([])
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string>('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const [filters, setFilters] = useState({
    dateFrom: initialParams?.dateFrom || '', dateTo: initialParams?.dateTo || '',
    customer: '', filmCode: '', dispatchType: initialParams?.dispatchType || '',
    plant: selectedPlant?.name || '',
  })

  useEffect(() => {
    setFilters(f => ({ ...f, plant: selectedPlant?.name || '' }))
  }, [selectedPlant])

  const fetchCustomers = useCallback(async () => {
    const res = await fetch(`/api/dispatch/customers?plant=${filters.plant}`)
    const d = await res.json()
    setCustomers(d.items || [])
  }, [filters.plant])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.plant) params.set('plant', filters.plant)
    if (filters.dateFrom && filters.dateTo) {
      params.set('dateFrom', filters.dateFrom)
      params.set('dateTo', filters.dateTo)
    }
    if (filters.customer) params.set('customer', filters.customer)
    if (filters.filmCode) params.set('filmCode', filters.filmCode)
    if (filters.dispatchType) params.set('dispatchType', filters.dispatchType)
    if (search) params.set('search', search)
    if (sortKey) { params.set('sort', sortKey); params.set('order', sortDir) }

    try {
      const res = await fetch(`/api/dispatch/report?${params}`)
      const d = await res.json()
      setData(d.data || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [filters, search, sortKey, sortDir])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-slate-300 ml-1" />
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 text-slate-600 ml-1" />
      : <ArrowDown className="w-3 h-3 text-slate-600 ml-1" />
  }

  const exportToCSV = () => {
    if (!canExport) return
    const headers = ['Date', 'Customer', 'Film Code', 'Quantity (Tons)', 'Type', 'Plant']
    const rows = data.map(r => [r.dispatchDate, r.customerName, r.filmCodeName, r.quantityTons, r.dispatchType, r.plantName])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `dispatch-report-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
    onAction()
  }

  const exportToPDF = () => {
    if (!canExport) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<html><head><title>Dispatch Report</title><style>
      body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f8fafc}
    </style></head><body><h2>Dispatch Report — ${filters.plant || 'All Plants'}</h2>
    <p>Date: ${new Date().toLocaleDateString()} | Records: ${data.length} | Total: ${data.reduce((s, r) => s + r.quantityTons, 0).toFixed(2)} Tons</p>
    <table><thead><tr><th>Date</th><th>Customer</th><th>Film Code</th><th>Qty (T)</th><th>Type</th></tr></thead><tbody>
    ${data.map(r => `<tr><td>${r.dispatchDate}</td><td>${r.customerName}</td><td>${r.filmCodeName}</td><td>${r.quantityTons.toFixed(2)}</td><td>${r.dispatchType}</td></tr>`).join('')}
    </tbody></table></body></html>`)
    w.document.close(); w.print()
    onAction()
  }

  const printReport = () => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<html><head><title>Dispatch Report</title><style>
      body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f8fafc}
    </style></head><body><h2>Dispatch Report</h2>
    <table><thead><tr><th>Date</th><th>Customer</th><th>Film Code</th><th>Qty (T)</th><th>Type</th><th>Plant</th></tr></thead><tbody>
    ${data.map(r => `<tr><td>${r.dispatchDate}</td><td>${r.customerName}</td><td>${r.filmCodeName}</td><td>${r.quantityTons.toFixed(2)}</td><td>${r.dispatchType}</td><td>${r.plantName}</td></tr>`).join('')}
    </tbody></table></body></html>`)
    w.document.close(); w.print()
  }

  const totalQty = data.reduce((s, r) => s + r.quantityTons, 0)

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Filters</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Plant</label>
            <select value={filters.plant} onChange={e => setFilters({ ...filters, plant: e.target.value })}
              className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
              <option value="">All Plants</option>
              {PLANTS.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Date From</label>
            <Input type="date" value={filters.dateFrom} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Date To</label>
            <Input type="date" value={filters.dateTo} onChange={e => setFilters({ ...filters, dateTo: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Customer</label>
            <select value={filters.customer} onChange={e => setFilters({ ...filters, customer: e.target.value })}
              className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
              <option value="">All Customers</option>
              {customers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Film Code</label>
            <select value={filters.filmCode} onChange={e => setFilters({ ...filters, filmCode: e.target.value })}
              className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
              <option value="">All Films</option>
              {filmCodes.map(f => <option key={f.id} value={f.filmCodeName}>{f.filmCodeName}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Type</label>
            <select value={filters.dispatchType} onChange={e => setFilters({ ...filters, dispatchType: e.target.value })}
              className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
              <option value="">All Types</option>
              <option value="Local">Local</option>
              <option value="Export">Export</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
          <Input placeholder="Search results..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{data.length} records · {totalQty.toFixed(2)} T</span>
          {canExport && (
            <>
              <Button variant="outline" size="sm" onClick={exportToCSV}><Download className="w-3.5 h-3.5 mr-1" /> Excel</Button>
              <Button variant="outline" size="sm" onClick={exportToPDF}><FileText className="w-3.5 h-3.5 mr-1" /> PDF</Button>
              <Button variant="outline" size="sm" onClick={printReport}><Printer className="w-3.5 h-3.5 mr-1" /> Print</Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {[
                  { key: 'dispatchDate', label: 'Date' },
                  { key: 'customerName', label: 'Customer' },
                  { key: 'filmCodeName', label: 'Film Code' },
                  { key: 'quantityTons', label: 'Quantity (T)' },
                  { key: 'dispatchType', label: 'Type' },
                  { key: 'plantName', label: 'Plant' },
                ].map(col => (
                  <th key={col.key}
                    className={`text-left p-3 text-xs font-medium text-slate-500 cursor-pointer select-none hover:text-slate-700 ${col.key === 'quantityTons' ? 'text-right' : ''}`}
                    onClick={() => handleSort(col.key)}
                  >
                    <span className="inline-flex items-center">{col.label}<SortIcon col={col.key} /></span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">No records found.</td></tr>
              ) : (
                data.map(r => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3">{r.dispatchDate}</td>
                    <td className="p-3 font-medium">{r.customerName}</td>
                    <td className="p-3">{r.filmCodeName}</td>
                    <td className="p-3 text-right font-medium">{r.quantityTons.toFixed(2)}</td>
                    <td className="p-3">
                      <Badge variant={r.dispatchType === 'Export' ? 'default' : 'secondary'} className="text-xs">
                        {r.dispatchType}
                      </Badge>
                    </td>
                    <td className="p-3">{r.plantName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   DISPATCH ANALYTICS
   ═══════════════════════════════════════════════════════════════ */
function DispatchAnalytics({ plantColor }: { plantColor: string }) {
  const { selectedPlant } = usePlant()
  const [typeFilter, setTypeFilter] = useState('')
  const [daily, setDaily] = useState<{ date: string; tons: number }[]>([])
  const [customerWise, setCustomerWise] = useState<{ name: string; tons: number }[]>([])
  const [filmWise, setFilmWise] = useState<{ name: string; tons: number }[]>([])
  const [totalTons, setTotalTons] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)

  const [plantWiseData, setPlantWiseData] = useState<{ plant: string; tons: number }[]>([])
  const [plantWiseMonths, setPlantWiseMonths] = useState<string[]>([])
  const [plantWiseMonth, setPlantWiseMonth] = useState('')
  const [plantWiseType, setPlantWiseType] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedPlant) params.set('plant', selectedPlant.name)
    if (typeFilter) params.set('dispatchType', typeFilter)
    try {
      const res = await fetch(`/api/dispatch/analytics?${params}`)
      const d = await res.json()
      setDaily(d.daily || [])
      setCustomerWise(d.customerWise || [])
      setFilmWise(d.filmWise || [])
      setTotalTons(d.totalTons || 0)
      setTotalRecords(d.totalRecords || 0)
    } catch { /* ignore */ }
    setLoading(false)
  }, [selectedPlant, typeFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const fetchPlantWise = useCallback(async (month?: string, dtype?: string) => {
    try {
      const params = new URLSearchParams()
      if (month) params.set('month', month)
      if (dtype) params.set('dispatchType', dtype)
      const res = await fetch(`/api/analytics/dispatch-plant-wise?${params}`)
      const data = await res.json()
      setPlantWiseData(data.plantData || [])
      if (!month) setPlantWiseMonths(data.months || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchPlantWise() }, [fetchPlantWise])

  const handlePlantWiseMonthChange = (m: string) => {
    setPlantWiseMonth(m)
    fetchPlantWise(m || undefined, plantWiseType || undefined)
  }

  const handlePlantWiseTypeChange = (t: string) => {
    setPlantWiseType(t)
    fetchPlantWise(plantWiseMonth || undefined, t || undefined)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold">Dispatch Analytics</h2>
            <p className="text-xs text-slate-500">Total: <strong>{totalTons.toFixed(1)}</strong> Tons · <strong>{totalRecords}</strong> records</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600">Type:</label>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
            <option value="">All (Export + Local)</option>
            <option value="Export">Export Only</option>
            <option value="Local">Local Only</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading analytics...</div>
      ) : totalRecords === 0 ? (
        <Card className="p-8 text-center text-slate-400 text-sm">No dispatch data to analyze yet.</Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-4 lg:col-span-2">
            <h3 className="font-semibold text-sm mb-3">Daily Dispatch Quantity (Tons)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(2)} T`, 'Dispatch']} />
                <Bar dataKey="tons" fill={plantColor} name="Tons" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">Customer-wise Dispatch</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={customerWise} cx="50%" cy="50%" outerRadius={90} dataKey="tons" nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {customerWise.map((_, i) => <Cell key={i} fill={CHART_COLORS.film[i % CHART_COLORS.film.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `${v.toFixed(2)} Tons`} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4 lg:col-span-3">
            <h3 className="font-semibold text-sm mb-3">Film-wise Dispatch Quantity</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={filmWise} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(2)} T`, 'Tons']} />
                <Bar dataKey="tons" fill={plantColor} name="Tons" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Plant Wise Dispatch Graph */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Plant Wise Dispatch</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {['', 'Export', 'Local'].map(t => (
                <button key={t} onClick={() => handlePlantWiseTypeChange(t)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                    plantWiseType === t
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}>
                  {t || 'All'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">Month:</label>
              <select value={plantWiseMonth} onChange={e => handlePlantWiseMonthChange(e.target.value)}
                className="h-8 px-2 text-sm border border-slate-200 rounded-lg bg-white">
                <option value="">All Time</option>
                {plantWiseMonths.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>
        {plantWiseData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={plantWiseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="plant" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(val: number) => `${val.toFixed(1)} Tons`} />
              <Bar dataKey="tons" name="Dispatch (Tons)">
                {plantWiseData.map((entry) => {
                  const cfg = getPlantConfig(entry.plant)
                  return <Cell key={entry.plant} fill={cfg?.color || '#6366f1'} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-slate-400 py-8 text-sm">No dispatch data available</p>
        )}
      </Card>
    </div>
  )
}
