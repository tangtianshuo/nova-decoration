import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
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
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useAppStore } from '@/store/app';
import type { Asset, AuthMeResponse, ShareLink, ShowcasePage } from '@/types';

const ENABLE_MOCK_AUTH = import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';

export default function App() {
  const token = useAuthStore((s) => s.token);
  const login = useAuthStore((s) => s.login);
  const setAssets = useAppStore((s) => s.setAssets);
  const setPages = useAppStore((s) => s.setPages);
  const setShareLinks = useAppStore((s) => s.setShareLinks);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (ENABLE_MOCK_AUTH) {
        if (!cancelled) setBootstrapping(false);
        return;
      }

      if (!token) {
        setAssets([]);
        setPages([]);
        setShareLinks([]);
        if (!cancelled) setBootstrapping(false);
        return;
      }

      try {
        const meResp = await api.get<AuthMeResponse>('/auth/me');
        if (cancelled) return;

        login(token, meResp.data.user, meResp.data.company);

        if (meResp.data.user.role === 'super_admin') {
          setAssets([]);
          setPages([]);
          setShareLinks([]);
          return;
        }

        const [assetsResp, pagesResp, shareResp] = await Promise.all([
          api.get<Asset[]>('/assets'),
          api.get<ShowcasePage[]>('/pages'),
          api.get<ShareLink[]>('/share-links'),
        ]);
        if (cancelled) return;
        setAssets(assetsResp.data);
        setPages(pagesResp.data);
        setShareLinks(shareResp.data);
      } catch {
        if (cancelled) return;
        setAssets([]);
        setPages([]);
        setShareLinks([]);
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    };

    setBootstrapping(true);
    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [token, login, setAssets, setPages, setShareLinks]);

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">正在恢复登录状态与数据...</p>
      </div>
    );
  }

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

        <Route path="/s/:pageId" element={<Showcase />} />
        <Route path="/fallback" element={<Fallback />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
