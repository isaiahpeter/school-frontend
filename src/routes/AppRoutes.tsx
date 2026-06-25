import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppShell from '../AppShell'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import ProtectedRoute from '../components/ProtectedRoute'
import DashboardPage from '../pages/DashboardPage'
import StudentsPage from '../pages/StudentsPage'
import StudentDetailPage from '../pages/StudentDetailPage'
import VisitorsPage from '../pages/VisitorsPage'
import CapturePage from '../pages/CapturePage'
import SettingsPage from '../pages/SettingsPage'
import ResultsPage from '../pages/ResultsPage'
import FeesPage from '../pages/FeesPage'
import AdminPage from '../pages/AdminPage'
import ChatPage from '../pages/ChatPage'
import QuizzesPage from '../pages/QuizzesPage'
import AttendancePage from '../pages/AttendancePage'
import EnterMarksPage from '../pages/EnterMarksPage'
import TeacherCommentsPage from '../pages/TeacherCommentsPage'
import ParentDashboard from '../pages/ParentDashboard'
import StudentProfileEditor from '../pages/StudentProfileEditor'
import CreateUserPage from '../pages/CreateUserPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public routes ── */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ── Protected routes inside AppShell ── */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          {/* Common */}
          <Route index                element={<DashboardPage />} />
          <Route path="dashboard"     element={<DashboardPage />} />
          <Route path="settings"      element={<SettingsPage />} />
          <Route path="results"       element={<ResultsPage />} />
          <Route path="chat"          element={<ChatPage />} />
          <Route path="quizzes"       element={<QuizzesPage />} />
          <Route path="visitors"      element={<VisitorsPage />} />
          <Route path="capture"       element={<CapturePage />} />

          {/* Parent only */}
          <Route path="parent" element={
            <ProtectedRoute roles={['parent']}>
              <ParentDashboard />
            </ProtectedRoute>
          } />

          {/* Admin + Teacher */}
          <Route path="students" element={
            <ProtectedRoute roles={['admin','teacher']}>
              <StudentsPage />
            </ProtectedRoute>
          } />
          <Route path="students/:id" element={
            <ProtectedRoute roles={['admin','teacher']}>
              <StudentDetailPage />
            </ProtectedRoute>
          } />
          <Route path="attendance" element={
            <ProtectedRoute roles={['admin','teacher']}>
              <AttendancePage />
            </ProtectedRoute>
          } />
          <Route path="enter-marks" element={
            <ProtectedRoute roles={['admin','teacher']}>
              <EnterMarksPage />
            </ProtectedRoute>
          } />
          <Route path="comments" element={
            <ProtectedRoute roles={['admin','teacher']}>
              <TeacherCommentsPage />
            </ProtectedRoute>
          } />

          {/* Admin only */}
          <Route path="admin" element={
            <ProtectedRoute roles={['admin']}>
              <AdminPage />
            </ProtectedRoute>
          } />
          <Route path="student-profiles" element={
            <ProtectedRoute roles={['admin']}>
              <StudentProfileEditor />
            </ProtectedRoute>
          } />
          <Route path="create-user" element={
            <ProtectedRoute roles={['admin']}>
              <CreateUserPage />
            </ProtectedRoute>
          } />
<Route path="fees" element={
  <ProtectedRoute roles={['admin', 'parent']}>
    <FeesPage />
  </ProtectedRoute>
} />
</Route>
      </Routes>
    </BrowserRouter>
  )
}
