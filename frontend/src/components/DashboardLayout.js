import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { SignOut, ChartBar, User, Briefcase, CurrencyDollar, GearSix, FileText } from '@phosphor-icons/react';

export default function DashboardLayout({ children, role }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavItems = () => {
    if (role === 'publisher') {
      return [
        { path: '/publisher/dashboard', label: 'Dashboard', icon: ChartBar },
        { path: '/publisher/profile', label: 'Profile', icon: User },
        { path: '/publisher/my-brands', label: 'My Brands', icon: Briefcase },
        { path: '/publisher/campaigns', label: 'Campaigns', icon: Briefcase },
        { path: '/publisher/reports', label: 'Reports', icon: FileText },
        { path: '/publisher/earnings', label: 'Earnings', icon: CurrencyDollar },
      ];
    } else if (role === 'brand') {
      return [
        { path: '/brand/dashboard', label: 'Dashboard', icon: ChartBar },
        { path: '/brand/profile', label: 'Profile', icon: User },
        { path: '/brand/my-publishers', label: 'My Publishers', icon: User },
        { path: '/brand/campaigns', label: 'Campaigns', icon: Briefcase },
        { path: '/brand/reporting', label: 'Reports', icon: FileText },
      ];
    } else if (role === 'admin') {
      return [
        { path: '/admin/dashboard', label: 'Dashboard', icon: ChartBar },
        { path: '/admin/directory', label: 'Directory', icon: User },
        { path: '/admin/users', label: 'Users', icon: User },
        { path: '/admin/campaigns', label: 'Campaigns', icon: Briefcase },
        { path: '/admin/reports', label: 'Reports', icon: FileText },
        { path: '/admin/create-brand', label: 'Create Brand', icon: User },
        { path: '/admin/benchmarks', label: 'Benchmarks', icon: GearSix },
        { path: '/admin/settlements', label: 'Settlements', icon: CurrencyDollar },
      ];
    }
    return [];
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen flex bg-muted">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white">
        <div className="p-6 border-b">
          <h1 className="font-heading text-2xl font-bold text-foreground">TMOE</h1>
          <p className="text-sm text-muted-foreground mt-1 capitalize">{role} Portal</p>
        </div>

        <nav className="p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={
                  `w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-foreground'
                  }`
                }
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon size={20} weight="regular" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t bg-white">
          <div className="mb-3">
            <p className="text-sm font-medium text-foreground">{user?.email}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full border hover:bg-muted"
            data-testid="logout-button"
          >
            <SignOut size={20} weight="regular" className="mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-white">
        {children}
      </main>
    </div>
  );
}
