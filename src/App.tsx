import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './store/AuthContext'
import { ThemeProvider } from './store/ThemeContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import StudentLayout from './components/layout/StudentLayout'
import TeacherLayout from './components/layout/TeacherLayout'
import SplashScreen from './pages/auth/SplashScreen'
import LoginPage from './pages/auth/LoginPage'
import StudentDashboard from './pages/student/StudentDashboard'
import StudentProfile from './pages/student/StudentProfile'
import LearningMaterials from './pages/student/LearningMaterials'
import LessonPlayer from './pages/student/LessonPlayer'
import StudentAssessments from './pages/student/StudentAssessments'
import TakeAssessment from './pages/student/TakeAssessment'
import MySubmissions from './pages/student/MySubmissions'
import ProblemBank from './pages/student/ProblemBank'
import CreateProblem from './pages/student/CreateProblem'
import SolveProblem from './pages/student/SolveProblem'
import CreateDeck from './pages/student/CreateDeck'
import StudyDeck from './pages/student/StudyDeck'
import Leaderboard from './pages/student/Leaderboard'
import StudentProgress from './pages/student/StudentProgress'
import Achievements from './pages/student/Achievements'
import Games from './pages/student/Games'
import ArrayBlitz from './pages/student/games/ArrayBlitz'
import NodeConnect from './pages/student/games/NodeConnect'
import StackTower from './pages/student/games/StackTower'
import QueueRush from './pages/student/games/QueueRush'
import TreeBuilder from './pages/student/games/TreeBuilder'
import PathExplorer from './pages/student/games/PathExplorer'
import SortArena from './pages/student/games/SortArena'
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import TeacherBlocks from './pages/teacher/TeacherBlocks'
import TeacherAssessments from './pages/teacher/TeacherAssessments'
import TeacherMaterials from './pages/teacher/TeacherMaterials'
import GenerateQuiz from './pages/teacher/GenerateQuiz'
import CreateAssessment from './pages/teacher/CreateAssessment'
import ActivityLog from './pages/teacher/ActivityLog'
import TeacherStudents from './pages/teacher/TeacherStudents'
import TeacherProgress from './pages/teacher/TeacherProgress'
import './index.css'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<SplashScreen />} />
            <Route path="/login" element={<LoginPage />} />

            {/* OAuth callback */}
            <Route path="/auth/callback" element={<Navigate to="/student/dashboard" replace />} />

            {/* Student routes */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="courses" element={<LearningMaterials />} />
              <Route path="courses/:moduleId/lessons/:lessonId" element={<LessonPlayer />} />
              <Route path="assessments" element={<StudentAssessments />} />
              <Route path="assessments/:id" element={<TakeAssessment />} />
              <Route path="submissions" element={<MySubmissions />} />
              <Route path="problems" element={<ProblemBank />} />
              <Route path="problems/new" element={<CreateProblem />} />
              <Route path="problems/:id" element={<SolveProblem />} />
              <Route path="decks/new" element={<CreateDeck />} />
              <Route path="decks/:id" element={<StudyDeck />} />
              <Route path="progress" element={<StudentProgress />} />
              <Route path="games" element={<Games />} />
              <Route path="games/array-blitz" element={<ArrayBlitz />} />
              <Route path="games/node-connect" element={<NodeConnect />} />
              <Route path="games/stack-tower" element={<StackTower />} />
              <Route path="games/queue-rush" element={<QueueRush />} />
              <Route path="games/tree-builder" element={<TreeBuilder />} />
              <Route path="games/path-explorer" element={<PathExplorer />} />
              <Route path="games/sort-arena" element={<SortArena />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="achievements" element={<Achievements />} />
              <Route path="profile" element={<StudentProfile />} />
            </Route>

            {/* Teacher routes */}
            <Route
              path="/teacher"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<TeacherDashboard />} />
              <Route path="blocks" element={<TeacherBlocks />} />
              <Route path="materials" element={<TeacherMaterials />} />
              <Route path="assessments" element={<TeacherAssessments />} />
              <Route path="assessments/generate" element={<GenerateQuiz />} />
              <Route path="assessments/create" element={<CreateAssessment />} />
              <Route path="activity-log" element={<ActivityLog />} />
              <Route path="students" element={<TeacherStudents />} />
              <Route path="progress" element={<TeacherProgress />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
