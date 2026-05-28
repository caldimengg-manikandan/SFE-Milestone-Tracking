import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  Table2, BarChart3, DollarSign, TrendingUp,
  GitBranch, Gauge, Printer, LogOut, Sun, Moon
} from 'lucide-react'

const TABS = [
  { path: '/',              label: 'Data Entry',   icon: Table2,     always: true },
  { path: '/print',         label: 'Print Setup',  icon: Printer,    always: true },
  { path: '/bid-performance', label: 'Bid Performance',  icon: BarChart3,  always: true },
  { path: '/dollar',        label: 'Dashboard',  icon: DollarSign, always: true },
  { path: '/job-analytics', label: 'Job Analytics',icon: TrendingUp, always: true },
  { path: '/sales-cycle',   label: 'Sales Cycle',  icon: GitBranch,  always: true },
  { path: '/capacity',      label: 'Capacity',     icon: Gauge,      always: true },
]

export default function Navigation() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  
  const [theme, setTheme] = useState(
    () => localStorage.getItem('sfe-theme') || 'dark'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('sfe-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const roleLabel = {
    manager: 'Manager',
    estimator: 'Estimator',
    detailing: 'Detailing',
    readonly: 'ReadOnly',
  }[user?.role] || 'ReadOnly'

  return (
    <nav className="nav-bar">
      <div className="nav-logo">
        <span style={{ color: 'var(--primary)' }}>SFE</span>
        <span style={{ color: 'var(--border-strong)', fontWeight: 300 }}>|</span>
        <span>RFQ MASTER</span>
      </div>

      <div className="nav-divider" />

      <div className="nav-tabs">
        {TABS.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
          >
            <Icon /> {label}
          </NavLink>
        ))}
      </div>

      <div className="nav-user">
        <span className="nav-user-name">{user?.username}</span>
        <span className="nav-user-badge">{roleLabel}</span>
        <button className="btn btn-ghost btn-sm" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} style={{ marginRight: '4px' }}>
          {theme === 'dark' ? <Sun style={{ width: '16px', height: '16px' }} /> : <Moon style={{ width: '16px', height: '16px' }} />}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout} title="Sign out">
          <LogOut />
        </button>
      </div>
    </nav>
  )
}
