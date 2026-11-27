import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthPage } from '@/pages/AuthPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
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
import { InstructionsPage } from '@/pages/InstructionsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminCompetitionsPage } from '@/pages/admin/AdminCompetitionsPage';
import { AdminQuestionsPage } from '@/pages/admin/AdminQuestionsPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminAuditLogPage } from '@/pages/admin/AdminAuditLogPage';
import { AdminTeachersPage } from '@/pages/admin/AdminTeachersPage';
import { QuizzesPage } from '@/pages/QuizzesPage';
import { QuizDetailPage } from '@/pages/QuizDetailPage';
import { PracticeSetupPage } from '@/pages/PracticeSetupPage';
import { SoloPlayPage } from '@/pages/SoloPlayPage';
import { SoloResultPage } from '@/pages/SoloResultPage';
import { StudioQuizzesPage } from '@/pages/studio/StudioQuizzesPage';
import { QuizEditorPage } from '@/pages/studio/QuizEditorPage';
import { QuizResultsPage } from '@/pages/studio/QuizResultsPage';
import { StudioClassesPage } from '@/pages/studio/StudioClassesPage';
import { ClassDetailPage } from '@/pages/studio/ClassDetailPage';
import { AssignmentProgressPage } from '@/pages/studio/AssignmentProgressPage';
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
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
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

                <Route path="/instructions" element={<InstructionsPage />} />

                {/* Solo play: quizzes + practice (every role) */}
                <Route path="/quizzes" element={<QuizzesPage />} />
                <Route path="/quizzes/join/:code" element={<QuizDetailPage />} />
                <Route path="/quizzes/:id" element={<QuizDetailPage />} />
                <Route path="/practice" element={<PracticeSetupPage />} />
                <Route path="/solo/:attemptId" element={<SoloPlayPage />} />
                <Route path="/solo/:attemptId/result" element={<SoloResultPage />} />
              </Route>
            </Route>

            {/* Quiz Studio: teachers, admins and superAdmins create quizzes & questions */}
            <Route element={<ProtectedRoute allowedRoles={['teacher', 'admin', 'superAdmin']} />}>
              <Route path="/studio" element={<AdminLayout mode="studio" />}>
                <Route index element={<StudioQuizzesPage />} />
                <Route path="quizzes/new" element={<QuizEditorPage />} />
                <Route path="quizzes/:id" element={<QuizEditorPage />} />
                <Route path="quizzes/:id/results" element={<QuizResultsPage />} />
                <Route path="classes" element={<StudioClassesPage />} />
                <Route path="classes/:id" element={<ClassDetailPage />} />
                <Route path="assignments/:id" element={<AssignmentProgressPage />} />
                <Route path="questions" element={<AdminQuestionsPage />} />
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

            {/* Only a superAdmin can add teachers */}
            <Route element={<ProtectedRoute allowedRoles={['superAdmin']} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route path="teachers" element={<AdminTeachersPage />} />
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
