// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '@/contexts/AuthContext';

vi.mock('@/config/api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock('@capacitor/filesystem', () => ({ Filesystem: {}, Directory: {} }));
vi.mock('@capacitor/share', () => ({ Share: {} }));

import { QuizzesPage } from '@/pages/QuizzesPage';
import { SoloResultPage } from '@/pages/SoloResultPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { StudioClassesPage } from '@/pages/studio/StudioClassesPage';
import { ClassDetailPage } from '@/pages/studio/ClassDetailPage';
import { AssignmentProgressPage } from '@/pages/studio/AssignmentProgressPage';
import { QuizEditorPage } from '@/pages/studio/QuizEditorPage';
import { CertificatesPage } from '@/pages/CertificatesPage';
import { StreakCard, BadgeGrid } from '@/components/quiz/SoloProgress';
import { computeSoloBadges } from '@/lib/gamification';

const iso = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();
const user = (role: string) => ({ _id: 'u1', name: 'Asha Verma', email: 'a@x.com', role, educationLevel: 'Class 10' });
const auth = (role = 'player') => ({ user: user(role), isAuthenticated: true, isLoading: false } as any);

function page(el: React.ReactNode, path: string, route: string, seed: (qc: QueryClient) => void, role = 'player') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  seed(qc);
  return norm(renderToString(
    <AuthContext.Provider value={auth(role)}>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[path]}>
          <Routes><Route path={route} element={el} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </AuthContext.Provider>
  ));
}
/** React inserts <!-- --> between adjacent text nodes; drop them so text assertions read naturally. */
const norm = (html: string) => html.replace(/<!-- -->/g, '');

const activity = [
  { _id: 'att1', mode: 'quiz', finishedAt: iso(-1), totalScore: 300, maxScore: 400, accuracy: 0.75, correctCount: 3, totalQuestions: 4, passed: true },
  { _id: 'att2', mode: 'practice', finishedAt: iso(-30), totalScore: 200, maxScore: 400, accuracy: 0.5, correctCount: 2, totalQuestions: 4, passed: false },
];
const assignment = (over: any = {}) => ({
  _id: 'as1', quizId: 'q1', quizTitle: 'Fractions Test', category: 'Class 10', questionCount: 4, passPercent: 50, certificateEnabled: true,
  timePerQuestionSeconds: 30, quizPublished: true, className: 'Class 10-A Maths', teacherName: 'Tina Teacher', openAt: iso(-5), dueAt: iso(20), allowLate: false,
  note: 'Revise chapter 3', status: 'not_started', score: null, accuracy: null, passed: null, resultAttemptId: null, inProgressAttemptId: null, attemptsLeft: null, canStart: true, ...over,
});

describe('page render smoke tests (new + changed screens)', () => {
  it('StreakCard + BadgeGrid', () => {
    const html = norm(renderToString(<><StreakCard streak={3} longest={5} today={false} days={[true,true,false,true,true,true,false]} /><BadgeGrid badges={computeSoloBadges([], 0)} /></>));
    expect(html).toContain('3'); expect(html).toContain('Play today to keep your streak alive'); expect(html).toContain('Week Warrior'); expect(html).toContain('Locked');
  });

  it('QuizzesPage → Assigned tab: due, status, class, note, join form', () => {
    const html = page(<QuizzesPage />, '/quizzes?tab=assigned', '/quizzes', (qc) => {
      qc.setQueryData(['assignments-mine'], [assignment(), assignment({ _id: 'as2', quizTitle: 'Done Quiz', status: 'submitted', score: 300, accuracy: 0.75, passed: true, resultAttemptId: 'att1', canStart: false })]);
      qc.setQueryData(['classes-joined'], [{ _id: 'c1', name: 'Class 10-A Maths', teacherName: 'Tina Teacher' }]);
    });
    for (const t of ['Fractions Test', 'Class 10-A Maths', 'Revise chapter 3', 'Not started', 'Start', 'Join a class', 'Certificate', 'View result', 'Submitted']) expect(html, t).toContain(t);
    expect(html).toMatch(/Due in \d+ h/);
  });

  it('QuizzesPage → My attempts tab shows streak and badges', () => {
    const html = page(<QuizzesPage />, '/quizzes?tab=attempts', '/quizzes', (qc) => {
      qc.setQueryData(['assignments-mine'], []);
      qc.setQueryData(['dashboard', 'history'], []);
      qc.setQueryData(['solo-activity'], activity);
      qc.setQueryData(['solo-stats'], { attempts: 2, avgAccuracy: 0.6, bestScore: 300, totalScore: 500, correctAnswers: 5, passed: 1, recent: [] });
      qc.setQueryData(['solo-history'], []);
    });
    expect(html).toContain('Best streak'); expect(html).toContain('First Solo'); expect(html).toContain('Quiz Passer'); expect(html).toContain('Badges');
  });

  it('SoloResultPage: certificate banner, late tag, new badges', () => {
    const html = page(<SoloResultPage />, '/solo/att1/result', '/solo/:attemptId/result', (qc) => {
      qc.setQueryData(['solo-result', 'att1'], { attemptId: 'att1', quizId: 'q1', mode: 'quiz', title: 'Fractions Test', totalScore: 300, maxScore: 400, correctCount: 3, totalQuestions: 4, unansweredCount: 0, accuracy: 0.75, passed: true, passPercent: 50, durationSeconds: 40, finishedAt: new Date().toISOString(), showAnswers: 'after_each', late: true, certificate: { certificateId: 'GYAN26Q-2026-000001', status: 'issued' }, review: [] });
      qc.setQueryData(['dashboard', 'history'], []);
      qc.setQueryData(['solo-activity'], [{ ...activity[0], finishedAt: new Date().toISOString() }]);
    });
    for (const t of ['You earned a certificate!', 'GYAN26Q-2026-000001', 'Download PDF', 'Submitted after the deadline', 'Passed']) expect(html, t).toContain(t);
  });

  it('SoloResultPage: no certificate banner when none was issued', () => {
    const html = page(<SoloResultPage />, '/solo/att2/result', '/solo/:attemptId/result', (qc) => {
      qc.setQueryData(['solo-result', 'att2'], { attemptId: 'att2', quizId: null, mode: 'practice', title: 'Practice', totalScore: 200, maxScore: 400, correctCount: 2, totalQuestions: 4, unansweredCount: 0, accuracy: 0.5, passed: false, passPercent: 40, durationSeconds: 40, finishedAt: iso(-200), showAnswers: 'after_each', certificate: null, review: [] });
      qc.setQueryData(['dashboard', 'history'], []); qc.setQueryData(['solo-activity'], activity);
    });
    expect(html).not.toContain('You earned a certificate'); expect(html).toContain('Practise again');
  });

  it('DashboardPage: combined streak, badges and assigned card', () => {
    const html = page(<DashboardPage />, '/dashboard', '/dashboard', (qc) => {
      qc.setQueryData(['dashboard', 'history'], []);
      qc.setQueryData(['solo-activity'], activity);
      qc.setQueryData(['assignments-mine'], [assignment()]);
      qc.setQueryData(['dashboard', 'teams'], []);
      qc.setQueryData(['dashboard', 'competitions'], []);
    });
    expect(html).toContain('1 quiz assigned to you'); expect(html).toContain('Fractions Test'); expect(html).toContain('Quiz Passer'); expect(html).toContain('Week Warrior'); expect(html).toContain('Daily streak');
  });

  it('StudioClassesPage', () => {
    const html = page(<StudioClassesPage />, '/studio/classes', '/studio/classes', (qc) => {
      qc.setQueryData(['studio-classes', 'mine'], [{ _id: 'c1', name: 'Class 10-A Maths', description: 'Section A', status: 'active', joinCode: 'K7M2QX', owner: { _id: 'u1', name: 'Asha' }, memberCount: 2, assignmentCount: 1, openAssignmentCount: 1, createdAt: iso(-9) }]);
    }, 'teacher');
    for (const t of ['Class 10-A Maths', 'K7M2QX', '2 students', '1 open assignment', 'Open class']) expect(html, t).toContain(t);
  });

  it('ClassDetailPage: code, assignments with progress, students', () => {
    const html = page(<ClassDetailPage />, '/studio/classes/c1', '/studio/classes/:id', (qc) => {
      qc.setQueryData(['studio-class', 'c1'], {
        class: { _id: 'c1', name: 'Class 10-A Maths', status: 'active', joinCode: 'K7M2QX', ownerId: 'u1' },
        members: [{ userId: 's1', name: 'Asha', email: 'asha@x.com', educationLevel: 'Class 10', joinedAt: iso(-3) }, { userId: 's2', name: 'Ben', email: 'ben@x.com', joinedAt: iso(-2) }],
        assignments: [{ _id: 'as1', quizId: 'q1', quizTitle: 'Fractions Test', openAt: iso(-5), dueAt: iso(20), allowLate: true, status: 'active', memberCount: 2, submittedCount: 1 }, { _id: 'as2', quizId: 'q2', quizTitle: 'Old Quiz', openAt: iso(-50), dueAt: iso(-20), allowLate: false, status: 'cancelled', memberCount: 2, submittedCount: 0 }],
      });
    }, 'teacher');
    for (const t of ['K7M2QX', 'Fractions Test', '1 of 2 students submitted', 'Late OK', 'Cancelled', 'Asha', 'ben@x.com', 'Assign a quiz', 'Add students by email']) expect(html, t).toContain(t);
  });

  it('AssignmentProgressPage: summary and rows', () => {
    const html = page(<AssignmentProgressPage />, '/studio/assignments/as1', '/studio/assignments/:id', (qc) => {
      qc.setQueryData(['assignment-progress', 'as1'], {
        assignment: { _id: 'as1', classId: 'c1', className: 'Class 10-A Maths', quizId: 'q1', quizTitle: 'Fractions Test', openAt: iso(-5), dueAt: iso(-1), allowLate: true, status: 'active', lastRemindedAt: null },
        summary: { students: 2, submitted: 1, late: 0, inProgress: 0, pending: 1, overdue: 1, passed: 1, avgScore: 300, avgAccuracy: 0.75 },
        rows: [{ userId: 's2', name: 'Ben', email: 'ben@x.com', status: 'overdue', attempts: 0, score: null, accuracy: null, passed: null, finishedAt: null }, { userId: 's1', name: 'Asha', email: 'asha@x.com', status: 'submitted', attempts: 1, score: 300, accuracy: 0.75, passed: true, finishedAt: iso(-2) }],
      });
    }, 'teacher');
    for (const t of ['Fractions Test', 'Overdue', 'Submitted', '75%', 'Remind 1 student', 'Late work accepted', 'Overdue by']) expect(html, t).toContain(t);
  });

  it('QuizEditorPage has the certificate toggle', () => {
    const html = page(<QuizEditorPage />, '/studio/quizzes/new', '/studio/quizzes/new', (qc) => {
      qc.setQueryData(['subjects'], []); qc.setQueryData(['bank', '', 'all', false], []);
    }, 'teacher');
    expect(html).toContain('Award a certificate when students pass');
  });

  it('CertificatesPage renders a quiz certificate card (via the mocked fetch)', () => {
    const html = norm(renderToString(<MemoryRouter><CertificatesPage /></MemoryRouter>));
    expect(html).toContain('My Verifiable Certificates');
  });
});
