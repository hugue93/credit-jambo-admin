import React, { useMemo, useState } from 'react'

const API_BASE = (() => {
  const raw = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').trim()
  return raw.replace(/\/+$/, '')
})()
const brandGreen = '#05A84A'

function notify(title: string, body?: string) {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body })
      }
    }
  } catch {}
}

const fmtTs = (v: any) => {
  if (!v) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'object') {
    const seconds = (v as any).seconds ?? (v as any)._seconds
    const nanos = (v as any).nanoseconds ?? (v as any)._nanoseconds ?? 0
    if (typeof seconds === 'number') {
      const ms = Math.floor(nanos / 1e6)
      const d = new Date(seconds * 1000 + ms)
      return d.toLocaleString()
    }
  }
  return String(v)
}

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(null)
  const [view, setView] = useState<'devices' | 'customers' | 'transactions'>('devices')
  const [showNotifPrompt, setShowNotifPrompt] = useState(false)

  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default' || Notification.permission === 'denied') setShowNotifPrompt(true)
      }
    } catch {}
  }, [])
  if (!token) return <Login onLoggedIn={setToken} />
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#F7F8FA', minHeight: '100vh' }}>
      <TopNav current={view} onChange={setView} onLogout={() => setToken(null)} />
      {showNotifPrompt && (
        <div style={{ padding: 10, background: '#FFF4E5', borderBottom: '1px solid #FFE0B2', color: '#7A4B00' }}>
          Enable notifications for admin actions
          <button
            onClick={async () => {
              try {
                const res = await Notification.requestPermission()
                if (res !== 'granted') alert('Please allow notifications in your browser site settings (lock icon ▶ Site settings ▶ Notifications ▶ Allow).')
              } catch {}
              setShowNotifPrompt(false)
            }}
            style={{ marginLeft: 8, padding: '6px 10px', borderRadius: 8, border: 'none', background: brandGreen, color: '#fff' }}
          >Allow</button>
        </div>
      )}
      <StatsBar token={token} />
      <div style={{ padding: 16 }}>
        {view === 'devices' && <PendingDevices token={token} />}
        {view === 'customers' && <Customers token={token} />}
        {view === 'transactions' && <Transactions token={token} />}
      </div>
    </div>
  )
}

const TopNav: React.FC<{ current: 'devices' | 'customers' | 'transactions'; onChange: (v: 'devices' | 'customers' | 'transactions') => void; onLogout: () => void }> = ({ current, onChange, onLogout }) => (
  <div style={{ display: 'flex', gap: 12, padding: 12, alignItems: 'center', background: '#fff', borderBottom: '1px solid #eee', position: 'sticky', top: 0, zIndex: 10 }}>
    <img src="/logo.png" alt="Logo" style={{ height: 28 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
    <strong style={{ color: brandGreen }}>Credit Jambo Admin</strong>
    <NavButton active={current === 'devices'} onClick={() => onChange('devices')}>Pending Devices</NavButton>
    <NavButton active={current === 'customers'} onClick={() => onChange('customers')}>Customers</NavButton>
    <NavButton active={current === 'transactions'} onClick={() => onChange('transactions')}>Transactions</NavButton>
    <div style={{ marginLeft: 'auto' }}>
      <button onClick={onLogout} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff' }}>Logout</button>
    </div>
  </div>
)

const NavButton: React.FC<{ active?: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{
    padding: '8px 12px', borderRadius: 8, border: `1px solid ${active ? brandGreen : '#ddd'}`,
    background: active ? brandGreen : '#fff', color: active ? '#fff' : '#222'
  }}>{children}</button>
)

const Login: React.FC<{ onLoggedIn: (t: string) => void }> = ({ onLoggedIn }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showNotifPrompt, setShowNotifPrompt] = useState(false)

  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission !== 'granted') setShowNotifPrompt(true)
      }
    } catch {}
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        try { await Notification.requestPermission() } catch {}
      }
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Login failed')
      onLoggedIn(data.token)
      // Initialize FCM and save token for admin notifications
      try {
        const vapid = (import.meta as any).env.VITE_VAPID_KEY as string | undefined
        if (vapid) {
          const t = await (window as any).__initAdminFcm?.(vapid)
          if (t) {
            await fetch(`${API_BASE}/admin/push-token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.token}` },
              body: JSON.stringify({ fcmToken: t })
            })
          }
        }
      } catch {}
      notify('Login successful', 'Welcome back')
    } catch (e: any) {
      setError(e.message || String(e))
    } finally { setLoading(false) }
  }

  return (
    <div style={{ maxWidth: 480, margin: '64px auto', padding: 16 }}>
      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 20, boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <img src="/logo.png" alt="Logo" style={{ height: 28 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <strong style={{ color: brandGreen }}>Credit Jambo Admin</strong>
        </div>
        {showNotifPrompt && (
          <div style={{ padding: 10, background: '#FFF4E5', border: '1px solid #FFE0B2', color: '#7A4B00', borderRadius: 8, marginBottom: 12 }}>
            Enable browser notifications for admin alerts
            <button
              onClick={async () => {
                try {
                  const res = await Notification.requestPermission()
                  if (res !== 'granted') alert('Please allow notifications in your browser site settings (lock icon ▶ Site settings ▶ Notifications ▶ Allow).')
                } catch {}
                setShowNotifPrompt(false)
              }}
              style={{ marginLeft: 8, padding: '6px 10px', borderRadius: 8, border: 'none', background: brandGreen, color: '#fff' }}
            >Allow</button>
          </div>
        )}
        {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}
        <form onSubmit={submit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#555' }}>Email</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd' }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#555' }}>Password</label>
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="password"
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd' }}
            />
          </div>
          <button
            disabled={loading}
            type="submit"
            style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: brandGreen, color: '#fff', fontWeight: 600 }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

const StatsBar: React.FC<{ token: string }> = ({ token }) => {
  const [stats, setStats] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [start, setStart] = useState<string>(() => {
    const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return d.toISOString().slice(0, 10)
  })
  const [end, setEnd] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])
  const money = useMemo(() => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }), [])
  const num = useMemo(() => new Intl.NumberFormat('en-RW'), [])

  const load = async () => {
    setError(null)
    try {
      const params = new URLSearchParams()
      if (start) params.set('start', start)
      if (end) params.set('end', end)
      const res = await fetch(`${API_BASE}/admin/stats?${params.toString()}`, { headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Failed to load stats')
      setStats(data)
    } catch (e: any) { setError(e.message || String(e)) }
  }

  React.useEffect(() => { load() }, [])

  return (
    <div style={{ padding: 12, borderBottom: '1px solid #eee', background: '#fafafa' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <strong style={{ color: brandGreen }}>Stats</strong>
        <label style={{ fontSize: 12, color: '#555' }}>
          Start
          <input
            type="date"
            value={start}
            onChange={e => setStart(e.target.value)}
            style={{ marginLeft: 6, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd' }}
          />
        </label>
        <label style={{ fontSize: 12, color: '#555' }}>
          End
          <input
            type="date"
            value={end}
            onChange={e => setEnd(e.target.value)}
            style={{ marginLeft: 6, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd' }}
          />
        </label>
        <button onClick={load} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: brandGreen, color: '#fff', fontWeight: 600 }}>Apply</button>
        {error && <span style={{ color: 'crimson' }}>{error}</span>}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        <StatCard label="Customers" value={stats ? num.format(Number(stats.customers || 0)) : '—'} />
        <StatCard label="Total Balance" value={stats ? money.format(Number(stats.totalBalance || 0)) : '—'} />
        <StatCard label="Deposits" value={stats ? money.format(Number(stats.deposits || 0)) : '—'} />
        <StatCard label="Withdrawals" value={stats ? money.format(Number(stats.withdrawals || 0)) : '—'} />
        <StatCard label="Transactions" value={stats ? num.format(Number(stats.transactions || 0)) : '—'} />
      </div>
    </div>
  )
}

const StatCard: React.FC<{ label: string; value: any }> = ({ label, value }) => (
  <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 6, minWidth: 150 }}>
    <div style={{ fontSize: 12, color: '#666' }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
  </div>
)

const PendingDevices: React.FC<{ token: string }> = ({ token }) => {
  const [devices, setDevices] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [userMap, setUserMap] = useState<Record<string, { name?: string; email?: string }>>({})
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  const load = async () => {
    setError(null)
    try {
      // Build user map to show plaintext name/email
      const cRes = await fetch(`${API_BASE}/admin/customers`, { headers })
      const customers = await cRes.json()
      if (cRes.ok && Array.isArray(customers)) {
        const map: Record<string, { name?: string; email?: string }> = {}
        for (const c of customers) {
          if (c?.userId) map[c.userId] = { name: c.userName, email: c.userEmail }
        }
        setUserMap(map)
      }
      const res = await fetch(`${API_BASE}/admin/devices/pending`, { headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Load failed')
      setDevices(data)
    } catch (e: any) { setError(e.message || String(e)) }
  }

  const verify = async (id: string) => {
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/admin/devices/${id}/verify`, { method: 'POST', headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Verify failed')
      await load()
      notify('Device verified', 'The device was approved successfully')
    } catch (e: any) { setError(e.message || String(e)) }
  }

  React.useEffect(() => { load() }, [])

  return (
    <div style={{ maxWidth: 1000, margin: '16px auto' }}>
      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{ margin: 0 }}>Pending Devices</h3>
          <button onClick={load} style={{ marginLeft: 'auto', padding: '6px 10px', borderRadius: 8, border: `1px solid ${brandGreen}`, background: '#fff', color: brandGreen }}>Refresh</button>
        </div>
        {error && <div style={{ color: 'crimson', marginTop: 8 }}>{error}</div>}
      </div>
      <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse', background: '#fff', border: '1px solid #eee', borderRadius: 12, overflow: 'hidden' as any }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>ID</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>User</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Email</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Device</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {devices.map(d => {
            const u = userMap[d.userId] || {}
            return (
              <tr key={d.id}>
                <td>{d.id}</td>
                <td>{u.name || d.userId}</td>
                <td>{u.email || ''}</td>
                <td>{d.deviceId}</td>
                <td>
                  <button onClick={() => verify(d.id)} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: brandGreen, color: '#fff' }}>Verify</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const Customers: React.FC<{ token: string }> = ({ token }) => {
  const [rows, setRows] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])
  const money = useMemo(() => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }), [])

  const load = async () => {
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/admin/customers`, { headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Load failed')
      setRows(data)
    } catch (e: any) { setError(e.message || String(e)) }
  }

  React.useEffect(() => { load() }, [])

  return (
    <div style={{ maxWidth: 1000, margin: '16px auto' }}>
      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{ margin: 0 }}>Customers</h3>
          <button onClick={load} style={{ marginLeft: 'auto', padding: '6px 10px', borderRadius: 8, border: `1px solid ${brandGreen}`, background: '#fff', color: brandGreen }}>Refresh</button>
        </div>
        {error && <div style={{ color: 'crimson', marginTop: 8 }}>{error}</div>}
      </div>
      <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse', background: '#fff', border: '1px solid #eee', borderRadius: 12, overflow: 'hidden' as any }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>User</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Email</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.accountId}>
              <td>{r.userName || r.userId}</td>
              <td>{r.userEmail}</td>
              <td>{money.format(Number(r.balance || 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const Transactions: React.FC<{ token: string }> = ({ token }) => {
  const [rows, setRows] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [filterName, setFilterName] = useState('')
  const [type, setType] = useState('')
  const [userMap, setUserMap] = useState<Record<string, { name?: string; email?: string }>>({})
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])
  const money = useMemo(() => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }), [])
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const load = async () => {
    setError(null)
    try {
      // Load customers to map userId -> {name,email}
      const cRes = await fetch(`${API_BASE}/admin/customers`, { headers })
      const customers = await cRes.json()
      if (cRes.ok && Array.isArray(customers)) {
        const map: Record<string, { name?: string; email?: string }> = {}
        for (const c of customers) {
          if (c?.userId) map[c.userId] = { name: c.userName, email: c.userEmail }
        }
        setUserMap(map)
      }

      const params = new URLSearchParams()
      if (type) params.set('type', type)
      if (start) params.set('start', start)
      if (end) params.set('end', end)
      const res = await fetch(`${API_BASE}/admin/transactions?${params.toString()}`, { headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Load failed')
      setRows(data)
    } catch (e: any) { setError(e.message || String(e)) }
  }

  React.useEffect(() => { load() }, [])

  return (
    <div style={{ maxWidth: 1100, margin: '16px auto' }}>
      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <h3 style={{ margin: 0 }}>Transactions</h3>
        {error && <div style={{ color: 'crimson', marginTop: 8 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
          <input
            placeholder="Filter by user name"
            value={filterName}
            onChange={e => setFilterName(e.target.value)}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd' }}
          />
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#fff' }}
          >
            <option value="">All</option>
            <option value="deposit">Deposit</option>
            <option value="withdraw">Withdraw</option>
          </select>
          <label style={{ fontSize: 12, color: '#555' }}>
            Start
            <input type="date" value={start} onChange={e => setStart(e.target.value)} style={{ marginLeft: 6, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd' }} />
          </label>
          <label style={{ fontSize: 12, color: '#555' }}>
            End
            <input type="date" value={end} onChange={e => setEnd(e.target.value)} style={{ marginLeft: 6, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd' }} />
          </label>
          <button onClick={load} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: brandGreen, color: '#fff', fontWeight: 600 }}>Apply</button>
          <button onClick={() => exportCsv(rows, userMap)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff' }}>Export CSV</button>
        </div>
      </div>
      <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse', background: '#fff', border: '1px solid #eee', borderRadius: 12, overflow: 'hidden' as any }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>User</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Type</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Amount</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Balance After</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Created</th>
          </tr>
        </thead>
        <tbody>
          {rows
            .filter((r) => {
              if (!filterName) return true
              const name = userMap[r.userId]?.name || ''
              return name.toLowerCase().includes(filterName.toLowerCase())
            })
            .map((r, i) => (
              <tr key={r.id || i}>
                <td>{userMap[r.userId]?.name || r.userId}</td>
                <td>{r.type}</td>
                <td>{money.format(Number(r.amount || 0))}</td>
                <td>{money.format(Number(r.balanceAfter || 0))}</td>
                <td>{fmtTs(r.createdAt)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}

function exportCsv(rows: any[], userMap: Record<string, { name?: string; email?: string }>) {
  const headers = ['User', 'Type', 'Amount', 'Balance After', 'Created']
  const csvRows = [headers.join(',')]
  for (const r of rows) {
    const user = userMap[r.userId]?.name || r.userId
    const created = fmtTs(r.createdAt).replace(/,/g, ' ')
    const line = [user, r.type, r.amount, r.balanceAfter, created].map(v => `${v}`).join(',')
    csvRows.push(line)
  }
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'transactions.csv'
  a.click()
  URL.revokeObjectURL(url)
}



