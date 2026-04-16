import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  SignOut,
  ChartBar,
  User,
  Briefcase,
  CurrencyDollar,
  GearSix,
  FileText,
  CaretDoubleLeft,
  CaretDoubleRight,
  SunDim,
  Moon,
} from '@phosphor-icons/react';

const LIGHT_MODE_LOGO = 'https://images.assettype.com/marvelof/2026-02-26/41khcrfg/logolightmode.svg';
const DARK_MODE_LOGO = 'https://images.assettype.com/marvelof/2025-09-12/y95jch3t/logodarkmode.svg';
const ADMIN_THEME_STORAGE_KEY = 'admin-dashboard-theme';

const ADMIN_THEME_COLORS = {
  dark: {
    '--adm-bg': '#0f1115',
    '--adm-sidebar': '#11151d',
    '--adm-surface': '#161a22',
    '--adm-surface-alt': '#11151d',
    '--adm-border': '#232734',
    '--adm-border-strong': '#2b3242',
    '--adm-text': '#ffffff',
    '--adm-muted': '#a1a7b3',
    '--adm-muted-soft': '#7f8797',
    '--adm-hover': '#1a202d',
    '--adm-chip': '#0f1115',
  },
  light: {
    '--adm-bg': '#f5f7fb',
    '--adm-sidebar': '#ffffff',
    '--adm-surface': '#ffffff',
    '--adm-surface-alt': '#f8fafc',
    '--adm-border': '#dce2ee',
    '--adm-border-strong': '#c9d2e5',
    '--adm-text': '#0f172a',
    '--adm-muted': '#5b6475',
    '--adm-muted-soft': '#78849a',
    '--adm-hover': '#eef2f8',
    '--adm-chip': '#f3f6fc',
  },
};

export default function DashboardLayout({ children, role }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const isAdmin = role === 'admin';
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [adminTheme, setAdminTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    const savedTheme = window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
    return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'light';
  });

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
  const isDarkTheme = adminTheme === 'dark';
  const logoSrc = isAdmin ? (isDarkTheme ? DARK_MODE_LOGO : LIGHT_MODE_LOGO) : LIGHT_MODE_LOGO;

  useEffect(() => {
    if (!isAdmin) return undefined;
    const mediaQuery = window.matchMedia('(max-width: 1024px)');
    const syncSidebarState = () => setIsSidebarCollapsed(mediaQuery.matches);
    syncSidebarState();
    mediaQuery.addEventListener('change', syncSidebarState);
    return () => mediaQuery.removeEventListener('change', syncSidebarState);
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, adminTheme);
    return undefined;
  }, [adminTheme, isAdmin]);

  if (isAdmin) {
    return (
      <div
        className="min-h-screen flex bg-[var(--adm-bg)] text-[var(--adm-text)] transition-colors duration-300"
        style={ADMIN_THEME_COLORS[adminTheme]}
        data-admin-theme={adminTheme}
      >
        <aside
          className={`relative border-r border-[var(--adm-border)] bg-[var(--adm-sidebar)] transition-all duration-300 ${
            isSidebarCollapsed ? 'w-20' : 'w-72'
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-[var(--adm-border)] px-4 py-5">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => navigate('/admin/dashboard')}
                  className={`overflow-hidden transition-all ${isSidebarCollapsed ? 'w-9' : 'w-28'}`}
                  aria-label="Go to dashboard"
                >
                  <img src={logoSrc} alt="NOVO logo" className="h-9 w-full object-contain" />
                </button>
                <div className="flex items-center gap-2">
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--adm-border-strong)] bg-[var(--adm-surface)] text-[var(--adm-muted)] transition-colors hover:text-[var(--adm-text)]"
                    onClick={() => setAdminTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                    aria-label={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
                  >
                    {isDarkTheme ? <SunDim size={15} /> : <Moon size={15} />}
                  </button>
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--adm-border-strong)] bg-[var(--adm-surface)] text-[var(--adm-muted)] transition-colors hover:text-[var(--adm-text)]"
                    onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                    aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  >
                    {isSidebarCollapsed ? <CaretDoubleRight size={16} /> : <CaretDoubleLeft size={16} />}
                  </button>
                </div>
              </div>
              {!isSidebarCollapsed && (
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--adm-muted-soft)]">{role} portal</p>
              )}
            </div>

            <nav className="flex-1 space-y-1 p-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`group flex w-full items-center rounded-xl px-3 py-2.5 text-left transition-all duration-300 ${
                      isActive
                        ? 'bg-[#f91445]/15 text-[#f91445] shadow-[0_0_0_1px_rgba(249,20,69,0.32)]'
                        : 'text-[var(--adm-muted)] hover:bg-[var(--adm-hover)] hover:text-[var(--adm-text)]'
                    } ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}
                    title={isSidebarCollapsed ? item.label : undefined}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    <Icon size={19} weight={isActive ? 'fill' : 'regular'} />
                    {!isSidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-[var(--adm-border)] p-3">
              <div className={`mb-3 rounded-xl bg-[var(--adm-surface)] p-3 ${isSidebarCollapsed ? 'text-center' : ''}`}>
                <div className="mb-2 flex items-center gap-3">
                  <div className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#f91445]/20 text-sm font-semibold text-[#f91445]">
                    {user?.email?.[0]?.toUpperCase() || 'A'}
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--adm-text)]">{user?.email}</p>
                      <p className="text-xs capitalize text-[var(--adm-muted)]">{user?.role}</p>
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleLogout}
                className={`h-10 border-[var(--adm-border-strong)] bg-transparent text-[var(--adm-muted)] transition-colors hover:bg-[var(--adm-hover)] hover:text-[var(--adm-text)] ${
                  isSidebarCollapsed ? 'w-full px-0' : 'w-full'
                }`}
                data-testid="logout-button"
              >
                <SignOut size={18} weight="regular" className={isSidebarCollapsed ? '' : 'mr-2'} />
                {!isSidebarCollapsed && 'Logout'}
              </Button>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-auto bg-[var(--adm-bg)]">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-muted">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white">
        <div className="p-6 border-b">
          <img src={logoSrc} alt="NOVO logo" className="h-10 w-28 object-contain" />
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
