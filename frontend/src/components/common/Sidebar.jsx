// src/components/common/Sidebar.jsx
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Bell,
  User,
  Shield,
  Users,
  Activity,
  Map,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/helpers';

const citizenSidebarLinks = [
  { to: '/citizen/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/citizen/report-missing', label: 'Report Missing', icon: Search },
  { to: '/citizen/report-sighting', label: 'Report Sighting', icon: Bell },
  { to: '/citizen/my-reports', label: 'My Reports', icon: FileCheck },
  { to: '/citizen/profile', label: 'Profile', icon: User },
];

const adminSidebarLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: Shield },
  { to: '/admin/matches', label: 'Review Matches', icon: Search },
  { to: '/admin/sightings', label: 'Sightings', icon: Bell },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/map', label: 'Live Map', icon: Map },
  { to: '/admin/system-health', label: 'System Health', icon: Activity },
];

export default function Sidebar({ isOpen, onClose }) {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const links = isAdmin ? adminSidebarLinks : citizenSidebarLinks;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 transition-transform duration-200 lg:translate-x-0 lg:static lg:z-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <nav className="p-4 space-y-1">
          {links.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-maroon-800 text-white'
                    : 'text-gray-600 hover:text-maroon-800 hover:bg-maroon-50'
                )}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}