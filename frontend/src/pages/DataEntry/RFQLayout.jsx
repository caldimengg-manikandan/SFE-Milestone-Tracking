import { Outlet, NavLink } from 'react-router-dom';

export default function RFQLayout() {
  const tabs = [
    { name: 'RFQ Data Entry', path: 'data-entry' },
    { name: 'Bid Performance', path: 'bid-performance' },
    { name: 'Dollar Dashboard', path: 'dollar-dashboard' },
    { name: 'Job Analytics', path: 'job-analytics' },
    { name: 'Sales Cycle', path: 'sales-cycle' },
    { name: 'Future Capacity', path: 'capacity' },
  ];

  return (
    <div className="rfq-scope w-full h-full flex flex-col" style={{ overflow: 'hidden' }}>
      {/* Tab navigation at the top */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-default)',
        background: 'var(--bg-surface)',
        padding: '0 var(--space-lg)',
        gap: 24,
        alignItems: 'center',
        height: 48,
        flexShrink: 0
      }}>
        {tabs.map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            style={({ isActive }) => ({
              display: 'inline-flex',
              alignItems: 'center',
              height: '100%',
              padding: '0 4px',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
              textDecoration: 'none',
              transition: 'all var(--transition-fast)',
              cursor: 'pointer',
              fontFamily: 'var(--font-head)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '-1px'
            })}
          >
            {tab.name}
          </NavLink>
        ))}
      </div>

      {/* Render sub-page content */}
      <div className="app-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Outlet />
      </div>
    </div>
  );
}
