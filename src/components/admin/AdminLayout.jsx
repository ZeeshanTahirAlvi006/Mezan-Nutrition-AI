import React, { useContext } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UtensilsCrossed,
  MessageSquare,
  CalendarDays,
  LogOut,
  Shield,
} from 'lucide-react';

const navItems = [
  { to: '/admin', end: true, icon: LayoutDashboard, label: 'Overview' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/food', icon: UtensilsCrossed, label: 'Food catalog' },
  { to: '/admin/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/admin/meal-plans', icon: CalendarDays, label: 'Meal plans' },
];

const AdminLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex">
      <aside className="w-64 border-r border-slate-700 bg-slate-950 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-2 text-emerald-400">
            <Shield className="w-6 h-6" />
            <span className="font-bold text-lg text-white">Admin</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 truncate">{user?.email}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, end, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="m-4 flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Log out
        </button>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur border-b border-slate-700 px-8 py-4">
          <h1 className="text-sm font-medium text-slate-400">Antigravity Nutrition — Administration</h1>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
