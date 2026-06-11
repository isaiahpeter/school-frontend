import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppShell from '../AppShell'
import LoginPage from '../pages/LoginPage'
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


function TeacherDashboardPlaceholder() {
  return <DashboardPage />
}
function StudentDashboardPlaceholder() {
  return <StudentsPage />
}
function ParentDashboardPlaceholder() {
  return <StudentsPage />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="students/:id" element={<StudentDetailPage />} />
          <Route path="visitors" element={<VisitorsPage />} />
          <Route path="capture" element={<CapturePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="results" element={<ResultsPage />} />
          <Route path="fees" element={<FeesPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="quizzes" element={<QuizzesPage />} />
          <Route
            path="admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="teacher"
            element={
              <ProtectedRoute roles={['teacher']}>
                <TeacherDashboardPlaceholder />
              </ProtectedRoute>
            }
          />
          <Route
            path="student"
            element={
              <ProtectedRoute roles={['student']}>
                <StudentDashboardPlaceholder />
              </ProtectedRoute>
            }
          />
          <Route
            path="parent"
            element={
              <ProtectedRoute roles={['parent']}>
                <ParentDashboardPlaceholder />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  )
}