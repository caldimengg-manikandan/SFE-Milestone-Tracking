import { Outlet, NavLink, Navigate } from 'react-router-dom';

export function ProductionIndex() {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const allowed = user.allowed_modules || [];
  const isAdmin = user.role === 'admin';

  if (isAdmin || allowed.includes('/production/priority-schedule')) {
    return <Navigate to="priority-schedule" replace />;
  }
  if (allowed.includes('/production/process-master')) {
    return <Navigate to="process-master" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

export default function ProductionLayout() {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const allowed = user.allowed_modules || [];
  const isAdmin = user.role === 'admin';

  const tabs = [
    { name: 'Production Schedule', path: 'priority-schedule', moduleKey: '/production/priority-schedule' },
    { name: 'Process Master', path: 'process-master', moduleKey: '/production/process-master' },
  ].filter(tab => isAdmin || allowed.includes(tab.moduleKey));

  return (
    <div className="w-full flex flex-col bg-slate-50/50 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8">
      {/* Tabs list */}
      <div className="bg-white border-b border-slate-200 px-6 flex gap-6 items-center h-[44px] shrink-0 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) => `
              inline-flex items-center h-[44px] px-1 py-3 text-xs font-bold transition-all border-b-2 tracking-wide uppercase
              ${isActive
                ? 'text-amber-500 border-amber-500 font-extrabold'
                : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300'
              }
            `}
          >
            {tab.name}
          </NavLink>
        ))}
      </div>

      {/* Dynamic Content Outlet */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8">
        <Outlet />
      </div>
    </div>
  );
}
