import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthPage } from '@/pages/AuthPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { CompetitionsPage } from '@/pages/CompetitionsPage';
import { CompetitionDetailPage } from '@/pages/CompetitionDetailPage';
import { TeamsPage } from '@/pages/TeamsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { GameLobbyPage } from '@/pages/GameLobbyPage';
import { GameArenaPage } from '@/pages/GameArenaPage';
import { ResultScorecardPage } from '@/pages/ResultScorecardPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { MatchHistoryPage } from '@/pages/MatchHistoryPage';
import { VerifyCertificatePage } from '@/pages/VerifyCertificatePage';
import { CertificatesPage } from '@/pages/CertificatesPage';
import { SupportPage } from '@/pages/SupportPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminCompetitionsPage } from '@/pages/admin/AdminCompetitionsPage';
import { AdminQuestionsPage } from '@/pages/admin/AdminQuestionsPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminAuditLogPage } from '@/pages/admin/AdminAuditLogPage';
import { NativeAppManager } from '@/components/native/NativeAppManager';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <NativeAppManager />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/verify-certificate/:certificateId" element={<VerifyCertificatePage />} />

            {/* Protected routes wrapped in AppLayout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/competitions" element={<CompetitionsPage />} />
                <Route path="/competitions/:id" element={<CompetitionDetailPage />} />
                <Route path="/teams" element={<TeamsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/notifications" element={<NotificationsPage />} />

                {/* Multiplayer Game Arena (Phase 4) */}
                <Route path="/lobby/:sessionId" element={<GameLobbyPage />} />
                <Route path="/game/:sessionId" element={<GameArenaPage />} />

                {/* Results, Leaderboard & History (Phase 5) */}
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/results" element={<ResultScorecardPage />} />
                <Route path="/results/:id" element={<ResultScorecardPage />} />
                <Route path="/history" element={<MatchHistoryPage />} />

                {/* Verifiable Certificates (Phase 6) */}
                <Route path="/certificates" element={<CertificatesPage />} />

                {/* Donations & Indian UPI Support (Phase 7) */}
                <Route path="/support" element={<SupportPage />} />
                <Route path="/donate" element={<Navigate to="/support" replace />} />

                {/* Stubs for future phases */}
                <Route path="/instructions" element={<DashboardPage />} />
              </Route>
            </Route>

            {/* Admin guarded routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'superAdmin']} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="competitions" element={<AdminCompetitionsPage />} />
                <Route path="questions" element={<AdminQuestionsPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="audit-logs" element={<AdminAuditLogPage />} />
              </Route>
            </Route>

            {/* 404 Catch-All */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" closeButton />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
