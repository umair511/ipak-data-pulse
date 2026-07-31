import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Shield, Search, Save, CheckCircle, Lock, User, Factory } from 'lucide-react'
import { ALL_PERMISSIONS, getModuleGroups } from '@/lib/permissions'
import { PLANTS } from '@/lib/plantConfig'

interface UserRow {
  id: string
  name: string
  username: string
  role: string
}

const moduleGroups = getModuleGroups()

export default function PermissionsManager() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [checkedPerms, setCheckedPerms] = useState<string[]>([])
  const [assignedPlants, setAssignedPlants] = useState<string[]>([])
  const [savingPerms, setSavingPerms] = useState(false)
  const [savingPlants, setSavingPlants] = useState(false)
  const [savedPerms, setSavedPerms] = useState(false)
  const [savedPlants, setSavedPlants] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'permissions' | 'plants'>('permissions')

  useEffect(() => {
    fetch('/api/user-management/list')
      .then(r => r.json())
      .then(d => { if (d.ok) setUsers(d.items || []) })
  }, [])

  const loadUserData = useCallback(async (user: UserRow) => {
    setSelectedUser(user)
    setSavedPerms(false)
    setSavedPlants(false)
    setLoading(true)
    try {
      if (user.role === 'admin') {
        setCheckedPerms(ALL_PERMISSIONS.map(p => p.id))
        setAssignedPlants(PLANTS.map(p => p.name))
      } else {
        const [permsRes, plantsRes] = await Promise.all([
          fetch(`/api/permissions/${user.id}`),
          fetch(`/api/plants/${user.id}`),
        ])
        const permsData = await permsRes.json()
        setCheckedPerms(permsData.ok ? (permsData.permissions || []) : [])
        const plantsData = await plantsRes.json()
        setAssignedPlants(plantsData.ok ? (plantsData.plants || []).map((p: any) => p.name) : [])
      }
    } catch {
      setCheckedPerms([])
      setAssignedPlants([])
    }
    setLoading(false)
  }, [])

  const togglePerm = (permId: string) => {
    setSavedPerms(false)
    setCheckedPerms(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    )
  }

  const togglePlant = (plantName: string) => {
    setSavedPlants(false)
    setAssignedPlants(prev =>
      prev.includes(plantName) ? prev.filter(p => p !== plantName) : [...prev, plantName]
    )
  }

  const handleSavePerms = async () => {
    if (!selectedUser || selectedUser.role === 'admin') return
    setSavingPerms(true)
    try {
      const res = await fetch(`/api/permissions/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: checkedPerms }),
      })
      const d = await res.json()
      if (d.ok) setSavedPerms(true)
    } catch { /* ignore */ }
    setSavingPerms(false)
  }

  const handleSavePlants = async () => {
    if (!selectedUser || selectedUser.role === 'admin') return
    setSavingPlants(true)
    try {
      const plantObjs = PLANTS.filter(p => assignedPlants.includes(p.name)).map(p => ({ id: p.id, name: p.name }))
      const res = await fetch(`/api/plants/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plants: plantObjs }),
      })
      const d = await res.json()
      if (d.ok) setSavedPlants(true)
    } catch { /* ignore */ }
    setSavingPlants(false)
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  )

  const isAdmin = selectedUser?.role === 'admin'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-slate-800">
        <Shield className="h-5 w-5 text-violet-600" />
        <span className="font-semibold text-base">User Access Management</span>
      </div>
      <p className="text-xs text-slate-500">
        Select a user, then assign Plants and Module Permissions. Admin always has full access.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4">
        {/* User list */}
        <Card className="border-slate-200">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Users</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-2">
            <ScrollArea className="h-[400px]">
              {filtered.map(u => (
                <button key={u.id} onClick={() => loadUserData(u)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition mb-1 ${
                    selectedUser?.id === u.id ? 'bg-violet-100 border border-violet-300' : 'hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 truncate">{u.name}</div>
                      <div className="text-xs text-slate-500">@{u.username} · <Badge variant="outline" className="text-[10px] px-1 py-0">{u.role}</Badge></div>
                    </div>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && <div className="text-center text-slate-400 py-8 text-sm">No users found</div>}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right panel */}
        <Card className="border-slate-200">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">
                  {selectedUser ? `${selectedUser.name}'s Access` : '← Select a user'}
                </CardTitle>
                {selectedUser && (
                  <CardDescription className="text-xs">
                    Role: <Badge variant="outline" className="text-xs">{selectedUser.role}</Badge>
                    {isAdmin && <span className="ml-1 text-amber-600">(admin — full access, locked)</span>}
                  </CardDescription>
                )}
              </div>
            </div>
            {selectedUser && (
              <div className="flex gap-1 mt-2">
                <button onClick={() => setActiveTab('permissions')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeTab === 'permissions' ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-100'}`}>
                  Module Permissions
                </button>
                <button onClick={() => setActiveTab('plants')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeTab === 'plants' ? 'bg-green-100 text-green-700' : 'text-slate-500 hover:bg-slate-100'}`}>
                  Plant Access
                </button>
              </div>
            )}
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {!selectedUser ? (
              <div className="text-center text-slate-400 py-16 text-sm">← Pehle user select karein</div>
            ) : loading ? (
              <div className="text-center text-slate-400 py-16 text-sm">Loading...</div>
            ) : activeTab === 'plants' ? (
              /* ═══ PLANT ACCESS TAB ═══ */
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Assign plants this user can access. If no plants are assigned, the user sees nothing.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {PLANTS.map(p => {
                    const isChecked = assignedPlants.includes(p.name)
                    return (
                      <label key={p.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition cursor-pointer ${
                          isAdmin ? 'bg-slate-50 cursor-not-allowed opacity-70 border-slate-200'
                          : isChecked ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Checkbox checked={isChecked} disabled={isAdmin} onCheckedChange={() => togglePlant(p.name)}
                          className={isAdmin ? 'opacity-50' : ''}
                        />
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.color }} />
                        <div>
                          <span className="text-sm font-semibold text-slate-800">{p.name}</span>
                          <span className="text-xs text-slate-400 ml-1">{p.emoji}</span>
                        </div>
                      </label>
                    )
                  })}
                </div>
                {!isAdmin && (
                  <div className="flex justify-end">
                    <Button size="sm" onClick={handleSavePlants} disabled={savingPlants}
                      className="bg-green-600 hover:bg-green-700 text-white">
                      {savedPlants ? <CheckCircle className="h-4 w-4 mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                      {savedPlants ? 'Saved ✓' : savingPlants ? 'Saving...' : 'Save Plant Access'}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* ═══ PERMISSIONS TAB ═══ */
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500">
                    {isAdmin ? 'Admin has all permissions (locked)' : 'Check permissions to grant. By default — none.'}
                  </p>
                  {!isAdmin && (
                    <Button size="sm" onClick={handleSavePerms} disabled={savingPerms}
                      className="bg-violet-600 hover:bg-violet-700 text-white">
                      {savedPerms ? <CheckCircle className="h-4 w-4 mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                      {savedPerms ? 'Saved ✓' : savingPerms ? 'Saving...' : 'Save Permissions'}
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-[340px]">
                  <div className="space-y-4 pr-4">
                    {moduleGroups.map(({ module, permissions: perms }) => {
                      const grantedInModule = perms.filter(p => checkedPerms.includes(p.id)).length
                      return (
                        <div key={module}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{module}</span>
                            <span className="text-[10px] text-slate-400">{grantedInModule}/{perms.length}</span>
                            <Separator className="flex-1" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                            {perms.map(p => {
                              const isChecked = checkedPerms.includes(p.id)
                              return (
                                <label key={p.id}
                                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm transition ${
                                    isAdmin ? 'bg-slate-50 cursor-not-allowed opacity-70'
                                    : isChecked ? 'bg-violet-50 hover:bg-violet-100 cursor-pointer' : 'hover:bg-slate-50 cursor-pointer'
                                  }`}
                                >
                                  <Checkbox checked={isChecked} disabled={isAdmin} onCheckedChange={() => togglePerm(p.id)}
                                    className={isAdmin ? 'opacity-50' : ''}
                                  />
                                  <span className={`text-xs ${isChecked && !isAdmin ? 'text-violet-700 font-medium' : 'text-slate-600'}`}>
                                    {p.label}
                                  </span>
                                  {isAdmin && <Lock className="h-3 w-3 text-slate-400 ml-auto" />}
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
