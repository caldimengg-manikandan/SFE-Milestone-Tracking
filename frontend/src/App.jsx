import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import Login from './features/auth/Login';
import ForgotPassword from './features/auth/ForgotPassword';
import ResetPassword from './features/auth/ResetPassword';
import Dashboard from './features/dashboard/Dashboard';
import EmployeeMaster from './pages/EmployeeMaster';
import ProjectMaster from './pages/ProjectMaster';
import ProductionPrioritySchedule from './pages/Production/ProductionPrioritySchedule';
import ProcessMaster from './pages/Production/ProcessMaster';
import CustomerMaster from './pages/CustomerMaster';
import DetailerMaster from './pages/DetailerMaster';
import PlanCreation from './pages/Structural/PlanCreation';
import PlanTracking from './pages/Structural/PlanTracking';

export default function App() {
  return (
    <Router basename="/SFE">
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="employees" element={<EmployeeMaster />} />
          <Route path="customers" element={<CustomerMaster />} />
          <Route path="management" element={<DetailerMaster />} />
          <Route path="projects" element={<ProjectMaster />} />
          
          {/* Structural Schedule Routes */}
          <Route path="structural/plan-creation" element={<PlanCreation />} />
          <Route path="structural/plan-tracking" element={<PlanTracking />} />
          
          {/* Production Management Routes */}
          <Route path="production/process-master" element={<ProcessMaster />} />
          <Route path="production/priority-schedule" element={<ProductionPrioritySchedule />} />

          <Route path="settings" element={<PlaceholderPage title="Settings" />} />
          <Route path="help" element={<PlaceholderPage title="Help & Support" />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

/* Placeholder for future pages */
function PlaceholderPage({ title }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
      <p className="text-sm text-slate-400 mt-2">Coming soon...</p>
    </div>
  );
}
