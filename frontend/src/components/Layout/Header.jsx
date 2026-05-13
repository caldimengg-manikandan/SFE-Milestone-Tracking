import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Sun,
  Moon,
  ArrowLeft,
} from 'lucide-react';

/* Map paths to page titles */
const pageTitles = {
  '/dashboard': 'Dashboard',
  '/employees': 'Employee Master',
  '/projects': 'Project Master',
  '/milestones': 'Milestone Management',
  '/settings': 'Settings',
  '/help': 'Help & Support',
  '/production/process-master': 'Process Master',
  '/production/priority-schedule': 'Production Priority Schedule',
  '/production/priority-plate': 'Priority Plate',
  '/production/angle-priority': 'Angle Priority',
  '/production/structural-priority': 'Structural Priority',
};

export default function Header({ onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const currentTitle = pageTitles[location.pathname] || 'Dashboard';
  const initials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'SF';

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login');
  };

  const notifications = [];

  const unreadCount = notifications.filter((n) => n.unread).length;

  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const formattedDate = time.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 h-[72px] bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center px-4 lg:px-6">
      {/* ── Left Section ── */}
      <div className="w-1/3 flex items-center gap-2">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-1 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Back Button (Replaces Search Bar) */}
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all flex items-center gap-2 group"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          <span className="hidden md:inline text-sm font-medium">Back</span>
        </button>
      </div>

      {/* ── Center Section: Centered Title ── */}
      <div className="w-1/3 flex justify-center">
        <h1 className="text-lg font-bold text-slate-800 tracking-tight whitespace-nowrap">
          {currentTitle}
        </h1>
      </div>

      {/* ── Right Section: Notifications, Time, Profile ── */}
      <div className="w-1/3 flex items-center justify-end gap-2 sm:gap-4">
        {/* Date & Time */}
        <div className="hidden xl:flex flex-col items-end leading-tight mr-2">
          <span className="text-[13px] font-bold text-slate-700 tabular-nums lowercase">
            {formattedTime}
          </span>
          <span className="text-[10px] font-medium text-slate-400">
            {formattedDate}
          </span>
        </div>

        {/* Notifications (Restored) */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>
          
          {/* Notifications Dropdown (Restored) */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden animate-fade-in">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800">Notifications</span>
              </div>
              <div className="max-h-72 overflow-y-auto scrollbar-thin">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-400">
                    <p className="text-sm font-semibold">No new notifications</p>
                    <p className="text-xs mt-1">You're all caught up!</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0">
                      <p className="text-sm font-semibold text-slate-700">{notif.title}</p>
                      <p className="text-xs text-slate-500">{notif.desc}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile (Restored Styling) */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
              {initials}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden animate-fade-in">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-800">{user.name || 'Admin'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
