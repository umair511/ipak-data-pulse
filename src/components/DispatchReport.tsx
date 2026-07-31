import React, { useEffect, useState, useCallback } from 'react'
import { usePlant } from '@/lib/PlantContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Truck, Globe, MapPin, Users, FileText, X, ArrowRight,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import { CHART_COLORS } from '@/lib/plantConfig'

interface ReportSummary {
  total: number
  exportTons: number
  localTons: number
  uniqueCustomers: number
  recordCount: number
  daily: { date: string; exportTons: number; localTons: number; total: number }[]
  customerWise: { name: string; exportTons: number; localTons: number; total: number }[]
  dateWise: { date: string; exportTons: number; localTons: number; total: number }[]
}

interface DispatchReportProps {
  initialParams?: Record<string, string>
}

export default function DispatchReport({ initialParams }: DispatchReportProps) {
  const { selectedPlant } = usePlant()
  const plantColor = selectedPlant?.color || '#16a34a'

  const [data, setData] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const [filters, setFilters] = useState({
    dispatchType: initialParams?.dispatchType || '',
    dateFrom: initialParams?.dateFrom || '',
    dateTo: initialParams?.dateTo || '',
    customer: '',
  })

  const hasActiveFilters = filters.dispatchType || filters.dateFrom || filters.dateTo || filters.customer

  const fetchData = useCallback(async () => {
    if (!selectedPlant) return
    setLoading(true)
    const params = new URLSearchParams({ plant: selectedPlant.name })
    if (filters.dispatchType) params.set('dispatchType', filters.dispatchType)
    if (filters.dateFrom && filters.dateTo) {
      params.set('dateFrom', filters.dateFrom)
      params.set('dateTo', filters.dateTo)
    }
    if (filters.customer) params.set('customer', filters.customer)

    try {
      const res = await fetch(`/api/dispatch/report-summary?${params}`)
      const json = await res.json()
      setData(json.ok ? json : null)
    } catch { setData(null) }
    setLoading(false)
  }, [selectedPlant, filters])

  useEffect(() => { fetchData() }, [fetchData])

  const clearFilters = () => setFilters({ dispatchType: '', dateFrom: '', dateTo: '', customer: '' })

  if (!selectedPlant) {
    return <div className="text-center py-12 text-slate-500">Please select a plant first.</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-6 h-6" style={{ color: plantColor }} /> Dispatch Report
          </h1>
          <p className="text-sm text-slate-500">{selectedPlant.name} — Customer & date-wise dispatch analytics</p>
        </div>
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <X className="w-3.5 h-3.5 mr-1" /> Clear Filters
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Dispatch Type</label>
            <select
              value={filters.dispatchType}
              onChange={e => setFilters({ ...filters, dispatchType: e.target.value })}
              className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white"
            >
              <option value="">All Types</option>
              <option value="Export">Export</option>
              <option value="Local">Local</option>
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
            <Input
              value={filters.customer}
              onChange={e => setFilters({ ...filters, customer: e.target.value })}
              placeholder="Filter by customer..."
            />
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading dispatch report...</div>
      ) : !data || data.recordCount === 0 ? (
        <Card className="p-8 text-center text-slate-400 text-sm">No dispatch data found for the selected filters.</Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KPICard label="Total Dispatch" value={data.total.toFixed(1)} unit="Tons" icon={Truck} color={plantColor} />
            <KPICard label="Export" value={data.exportTons.toFixed(1)} unit="Tons" icon={Globe} color="#16a34a" />
            <KPICard label="Local" value={data.localTons.toFixed(1)} unit="Tons" icon={MapPin} color="#f59e0b" />
            <KPICard label="Unique Customers" value={String(data.uniqueCustomers)} unit="customers" icon={Users} color="#8b5cf6" />
            <KPICard label="Total Records" value={String(data.recordCount)} unit="entries" icon={FileText} color="#0ea5e9" />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Daily Stacked Bar */}
            <Card className="p-4 lg:col-span-2">
              <h3 className="font-semibold text-sm mb-3">Daily Dispatch (Export vs Local) — Last 30 Dates</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(2)} T`, '']} />
                  <Legend />
                  <Bar dataKey="exportTons" stackId="a" fill="#16a34a" name="Export" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="localTons" stackId="a" fill="#f59e0b" name="Local" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Export vs Local Donut */}
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">Export vs Local Share</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Export', value: data.exportTons },
                      { name: 'Local', value: data.localTons },
                    ]}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    <Cell fill="#16a34a" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v.toFixed(2)} Tons`} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Top 10 Customers Horizontal Bar */}
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">Top 10 Customers</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.customerWise.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(2)} T`, 'Tons']} />
                  <Bar dataKey="total" fill={plantColor} name="Total Tons" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Customer-wise Table */}
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">Customer-wise Dispatch Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left p-3 text-xs font-medium text-slate-500">#</th>
                    <th className="text-left p-3 text-xs font-medium text-slate-500">Customer</th>
                    <th className="text-right p-3 text-xs font-medium text-slate-500">Export (T)</th>
                    <th className="text-right p-3 text-xs font-medium text-slate-500">Local (T)</th>
                    <th className="text-right p-3 text-xs font-medium text-slate-500">Total (T)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.customerWise.map((row, i) => (
                    <tr key={row.name} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 text-slate-400">{i + 1}</td>
                      <td className="p-3 font-medium">{row.name}</td>
                      <td className="p-3 text-right">
                        {row.exportTons > 0 ? (
                          <Badge variant="default" className="text-xs">{row.exportTons.toFixed(2)}</Badge>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="p-3 text-right">
                        {row.localTons > 0 ? (
                          <Badge variant="secondary" className="text-xs">{row.localTons.toFixed(2)}</Badge>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="p-3 text-right font-semibold">{row.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                    <td className="p-3" colSpan={2}>Total</td>
                    <td className="p-3 text-right">{data.exportTons.toFixed(2)}</td>
                    <td className="p-3 text-right">{data.localTons.toFixed(2)}</td>
                    <td className="p-3 text-right">{data.total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Date-wise Table */}
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">Date-wise Dispatch Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left p-3 text-xs font-medium text-slate-500">#</th>
                    <th className="text-left p-3 text-xs font-medium text-slate-500">Date</th>
                    <th className="text-right p-3 text-xs font-medium text-slate-500">Export (T)</th>
                    <th className="text-right p-3 text-xs font-medium text-slate-500">Local (T)</th>
                    <th className="text-right p-3 text-xs font-medium text-slate-500">Total (T)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dateWise.map((row, i) => (
                    <tr key={row.date} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 text-slate-400">{i + 1}</td>
                      <td className="p-3 font-medium">{row.date}</td>
                      <td className="p-3 text-right">
                        {row.exportTons > 0 ? (
                          <Badge variant="default" className="text-xs">{row.exportTons.toFixed(2)}</Badge>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="p-3 text-right">
                        {row.localTons > 0 ? (
                          <Badge variant="secondary" className="text-xs">{row.localTons.toFixed(2)}</Badge>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="p-3 text-right font-semibold">{row.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                    <td className="p-3" colSpan={2}>Total</td>
                    <td className="p-3 text-right">{data.exportTons.toFixed(2)}</td>
                    <td className="p-3 text-right">{data.localTons.toFixed(2)}</td>
                    <td className="p-3 text-right">{data.total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

function KPICard({
  label, value, unit, icon: Icon, color,
}: {
  label: string; value: string; unit: string; icon: any; color: string
}) {
  return (
    <Card className="p-4">
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
    </Card>
  )
}
