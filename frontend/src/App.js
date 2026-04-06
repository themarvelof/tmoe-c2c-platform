import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import '@/App.css';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import PublisherDashboard from './pages/publisher/PublisherDashboard';
import PublisherProfile from './pages/publisher/PublisherProfile';
import PublisherCampaigns from './pages/publisher/PublisherCampaigns';
import PublisherEarnings from './pages/publisher/PublisherEarnings';
import BrandDashboard from './pages/brand/BrandDashboard';
import BrandProfile from './pages/brand/BrandProfile';
import BrandCampaigns from './pages/brand/BrandCampaigns';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCampaigns from './pages/admin/AdminCampaigns';
import AdminBenchmarks from './pages/admin/AdminBenchmarks';
import AdminSettlements from './pages/admin/AdminSettlements';
import CampaignDetail from './pages/CampaignDetail';
import { useAuth } from './hooks/useAuth';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Publisher Routes */}
          <Route
            path="/publisher/dashboard"
            element={
              <ProtectedRoute allowedRoles={['publisher']}>
                <PublisherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/publisher/profile"
            element={
              <ProtectedRoute allowedRoles={['publisher']}>
                <PublisherProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/publisher/campaigns"
            element={
              <ProtectedRoute allowedRoles={['publisher']}>
                <PublisherCampaigns />
              </ProtectedRoute>
            }
          />
          <Route
            path="/publisher/earnings"
            element={
              <ProtectedRoute allowedRoles={['publisher']}>
                <PublisherEarnings />
              </ProtectedRoute>
            }
          />

          {/* Brand Routes */}
          <Route
            path="/brand/dashboard"
            element={
              <ProtectedRoute allowedRoles={['brand']}>
                <BrandDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/brand/profile"
            element={
              <ProtectedRoute allowedRoles={['brand']}>
                <BrandProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/brand/campaigns"
            element={
              <ProtectedRoute allowedRoles={['brand']}>
                <BrandCampaigns />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/campaigns"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminCampaigns />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/benchmarks"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminBenchmarks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settlements"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminSettlements />
              </ProtectedRoute>
            }
          />

          {/* Shared Routes */}
          <Route
            path="/campaigns/:campaignId"
            element={
              <ProtectedRoute>
                <CampaignDetail />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
