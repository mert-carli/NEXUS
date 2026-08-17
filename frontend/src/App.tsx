import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import Dashboard from './pages/Dashboard'
import CodeExplorer from './pages/CodeExplorer'
import Settings from './pages/Settings'
import Assistant from './pages/Assistant'
import OpenProjectModal from './components/OpenProjectModal'
import { useProjectStore } from './store/projectStore'

function App() {
  const { isOpenProjectModalOpen } = useProjectStore()

  return (
    <Router>
      {isOpenProjectModalOpen && <OpenProjectModal />}
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/code" element={<CodeExplorer />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </DashboardLayout>
    </Router>
  )
}

export default App
