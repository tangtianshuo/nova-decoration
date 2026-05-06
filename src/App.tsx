import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import RequireAuth from '@/components/RequireAuth';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import CompanyProfile from '@/pages/CompanyProfile';
import Assets from '@/pages/Assets';
import AssetUpload from '@/pages/AssetUpload';
import Pages from '@/pages/Pages';
import PageEditor from '@/pages/PageEditor';
import PageEdit from '@/pages/PageEdit';
import PageShare from '@/pages/PageShare';
import Showcase from '@/pages/Showcase';
import Fallback from '@/pages/Fallback';
import PlatformTenants from '@/pages/PlatformTenants';

export default function App() {
  return (
    <Router>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="company/profile" element={<CompanyProfile />} />
          <Route path="assets" element={<Assets />} />
          <Route path="assets/upload" element={<AssetUpload />} />
          <Route path="pages" element={<Pages />} />
          <Route path="pages/new" element={<PageEditor />} />
          <Route path="pages/:id/edit" element={<PageEdit />} />
          <Route path="pages/:id/share" element={<PageShare />} />
          <Route path="platform/tenants" element={<PlatformTenants />} />
        </Route>

        <Route path="/s/:slug" element={<Showcase />} />
        <Route path="/fallback" element={<Fallback />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
