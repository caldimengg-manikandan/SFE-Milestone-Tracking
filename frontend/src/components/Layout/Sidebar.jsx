import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Flag,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  Building2,
  FileSpreadsheet,
  ListChecks,
  Layers,
  Square,
  Box,
} from 'lucide-react';

/* ─── Navigation Config ─── */
const navSections = [
  {
    label: 'OVERVIEW',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      { name: 'Employee Master', path: '/employees', icon: Users },
    ],
  },
  {
    label: 'PROJECT MANAGEMENT',
    items: [
      { name: 'Project Master', path: '/projects', icon: FolderKanban },
      { name: 'Structural Schedule', path: '/structural-schedule', icon: FileSpreadsheet },
    ],
  },
  {
    label: 'PRODUCTION MANAGEMENT',
    items: [
      { name: 'Production Priority Schedule', path: '/production/priority-schedule', icon: ListChecks },
      { name: 'Priority Plate', path: '/production/priority-plate', icon: Layers },
      { name: 'Angle Priority', path: '/production/angle-priority', icon: Square },
      { name: 'Structural Priority', path: '/production/structural-priority', icon: Box },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { name: 'Settings', path: '/settings', icon: Settings },
    ],
  },
];

export default function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'SF';

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login');
  };

  return (
    <>
      {/* ── Mobile Backdrop ── */}
      <div
        className={`
          fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden
          transition-opacity duration-300
          ${isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onCloseMobile}
      />

      {/* ── Sidebar Panel ── */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50
          sidebar-gradient shadow-sidebar
          border-r border-white/[0.06]
          flex flex-col
          transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${isCollapsed ? 'lg:w-[78px]' : 'lg:w-[240px]'}
          w-[240px]
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* ── Logo Area ── */}
        <div className="h-[72px] flex items-center px-5 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
            {/* Brand Icon */}
            <div className="relative w-10 h-10 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                <Building2 className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              {/* Pulse dot */}
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0c1222]" />
            </div>

            {/* Brand Text */}
            <div
              className={`flex flex-col min-w-0 transition-all duration-300 ${
                isCollapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'
              }`}
            >
              <span className="text-[15px] font-bold text-white tracking-wide truncate leading-tight">
                Steel Fab
              </span>
              <span className="text-[10px] font-semibold text-amber-400/80 tracking-[0.2em] uppercase truncate">
                Enterprises
              </span>
            </div>
          </div>

          {/* Mobile close */}
          <button
            onClick={onCloseMobile}
            className="ml-auto lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 scrollbar-thin">
          {navSections.map((section, sIdx) => (
            <div key={section.label} className={sIdx > 0 ? 'mt-6' : ''}>
              {/* Section Label */}
              {!isCollapsed && (
                <div className="px-3 mb-2 animate-fade-in">
                  <span className="text-[10px] font-semibold tracking-[0.15em] text-slate-500/80 uppercase select-none">
                    {section.label}
                  </span>
                </div>
              )}

              {/* Divider for collapsed mode */}
              {isCollapsed && sIdx > 0 && (
                <div className="mx-auto mb-3 w-8 border-t border-white/[0.06]" />
              )}

              {/* Nav Items */}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onCloseMobile}
                      className={`
                        sidebar-nav-item group
                        ${isActive ? 'active' : ''}
                        ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}
                      `}
                    >
                      <Icon
                        className={`nav-icon w-[20px] h-[20px] shrink-0 ${
                          isActive ? 'text-amber-400' : ''
                        }`}
                        strokeWidth={isActive ? 2 : 1.75}
                      />

                      {/* Label — hidden when collapsed on desktop */}
                      <span
                        className={`text-[13.5px] font-medium truncate transition-all duration-300 ${
                          isCollapsed ? 'lg:hidden' : ''
                        }`}
                      >
                        {item.name}
                      </span>

                      {/* Badge */}
                      {item.badge && !isCollapsed && (
                        <span className="ml-auto shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500/90 text-[10px] font-bold text-white shadow-sm">
                          {item.badge}
                        </span>
                      )}

                      {/* Badge dot for collapsed */}
                      {item.badge && isCollapsed && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 lg:block hidden" />
                      )}

                      {/* Tooltip — collapsed desktop only */}
                      {isCollapsed && (
                        <div className="sidebar-tooltip hidden lg:block">
                          {item.name}
                          {item.badge && (
                            <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-[9px] font-bold text-white">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── User Profile ── */}
        <div className="border-t border-white/[0.06] p-3 shrink-0">
          <div
            className={`flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer ${
              isCollapsed ? 'lg:justify-center lg:px-0' : ''
            }`}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-[13px] font-bold text-white ring-2 ring-white/10">
                {initials}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0c1222]" />
            </div>

            {/* User Info */}
            <div
              className={`flex-1 min-w-0 transition-all duration-300 ${
                isCollapsed ? 'lg:hidden' : ''
              }`}
            >
              <p className="text-sm font-semibold text-slate-200 truncate">
                {user.name || 'Admin User'}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {user.email || 'admin@steelfab.com'}
              </p>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className={`p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors ${
                isCollapsed ? 'lg:hidden' : ''
              }`}
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Collapse Toggle (desktop only) ── */}
        <button
          onClick={onToggleCollapse}
          className="
            hidden lg:flex items-center justify-center
            absolute -right-3 top-[82px]
            w-6 h-6 rounded-full
            bg-gradient-to-br from-amber-400 to-orange-500
            border border-amber-500/20
            text-white hover:scale-110
            transition-all duration-200
            shadow-lg shadow-orange-500/40
            z-50
          "
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </aside>
    </>
  );
}
