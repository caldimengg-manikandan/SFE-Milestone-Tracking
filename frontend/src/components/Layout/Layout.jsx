import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { authAPI } from '../../services/api';

export default function Layout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [user, setUser] = useState(() => JSON.parse(sessionStorage.getItem('user') || '{}'));

  // Sync user access permissions on mount
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await authAPI.me();
        const updatedUser = {
          ...user,
          name: res.data.first_name || res.data.last_name ? `${res.data.first_name} ${res.data.last_name}`.trim() : res.data.username,
          email: res.data.email,
          role: res.data.role,
          profile_picture: res.data.profile_picture,
          allowed_modules: res.data.allowed_modules
        };
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      } catch (err) {
        console.error("Failed to load user session", err);
      }
    };
    fetchMe();
  }, []);

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when mobile sidebar open
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  return (
    <div className="min-h-screen bg-white">
      {/* Sidebar */}
      <Sidebar
        user={user}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className={`
          transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${isCollapsed ? 'lg:ml-[78px]' : 'lg:ml-[240px]'}
        `}
      >
        <Header onMenuClick={() => setIsMobileOpen(true)} />

        <main className="min-h-[calc(100vh-72px)]">
          <div className="p-4 sm:p-6 lg:p-8 page-enter" >  
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
