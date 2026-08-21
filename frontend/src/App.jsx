import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import Login from './features/auth/Login';
import ForgotPassword from './features/auth/ForgotPassword';
import ResetPassword from './features/auth/ResetPassword';
import Dashboard from './features/dashboard/Dashboard';
import EmployeeMaster from './pages/EmployeeMaster';
import ProjectMaster from './pages/ProjectMaster';
import SteelBudgetInput from './pages/SteelBudgetInput';
import SteelBudgetResult from './pages/SteelBudgetResult';
import ProductionLayout, { ProductionIndex } from './pages/Production/ProductionLayout';
import ProductionPrioritySchedule from './pages/Production/ProductionPrioritySchedule';
import ProcessMaster from './pages/Production/ProcessMaster';
import ProcessMasterSettings from './pages/Production/ProcessMasterSettings';
import CustomerMaster from './pages/CustomerMaster';
import DetailerMaster from './pages/DetailerMaster';
import PlanCreation from './pages/Structural/PlanCreation';
import PlanTracking from './pages/Structural/PlanTracking';
import CapacityMapping from './pages/CapacityMapping';
import Settings from './pages/Settings';
import Announcements from './pages/Announcements';
import EstimationModel from './pages/EstimationModel';
import EstimationSummary from './pages/EstimationSummary';
import BidEnquiry from './pages/Bids/BidEnquiry';
import InternalBidSchedule from './pages/Bids/InternalBidSchedule';
import HolidayCalendar from './pages/Bids/HolidayCalendar';
import UserAccess from './pages/UserAccess';
import AgentSettings from './pages/AgentSettings';

// ── Estimation Erection Imports ──────────────────────────────────────────────
import EstimationErectionLayout from './pages/EstimationErection/EstimationErectionLayout';
import ErectionTakeoffTab from './pages/EstimationErection/ErectionTakeoffTab';
import FieldMomentConnTab from './pages/EstimationErection/FieldMomentConnTab';
import EstimateDataTab from './pages/EstimationErection/EstimateDataTab';
import CoreTab from './pages/EstimationErection/CoreTab';


// ── RFQ Module & Dashboard Integrations ───────────────────────────────────────
import RFQLayout from './pages/DataEntry/RFQLayout';
import DataEntryPage from './pages/DataEntry/DataEntryPage';
import PrintSetupPage from './pages/PrintSetup/PrintSetupPage';
import BidPerformancePage from './pages/BidPerformance/BidPerformancePage';
import DollarDashboardPage from './pages/DollarDashboard/DollarDashboardPage';
import JobAnalyticsPage from './pages/JobAnalytics/JobAnalyticsPage';
import SalesCyclePage from './pages/SalesCycle/SalesCyclePage';
import FutureCapacityPage from './pages/FutureCapacity/FutureCapacityPage';
import './assets/styles/rfq-scope.css';

// ── Query Client Instantiation ───────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
          <Route path="dashboard" element={<ProtectedRoute moduleKey="/dashboard"><Dashboard /></ProtectedRoute>} />
          <Route path="estimation" element={<Navigate to="/estimation-erection/estimation" replace />} />
          <Route path="estimation-summary" element={<ProtectedRoute moduleKey="/estimation-summary"><EstimationSummary /></ProtectedRoute>} />
          
          {/* Bid Management Routes */}
          <Route path="bids/enquiry" element={<ProtectedRoute moduleKey="/rfq"><BidEnquiry /></ProtectedRoute>} />
          <Route path="bids/schedule" element={<ProtectedRoute moduleKey="/bids/schedule"><InternalBidSchedule /></ProtectedRoute>} />
          <Route path="bids/holidays" element={<ProtectedRoute moduleKey="/bids/holidays"><HolidayCalendar /></ProtectedRoute>} />

          <Route path="employees" element={<ProtectedRoute moduleKey="employees"><EmployeeMaster /></ProtectedRoute>} />
          <Route path="customers" element={<ProtectedRoute moduleKey="customers"><CustomerMaster /></ProtectedRoute>} />
          <Route path="detailers" element={<ProtectedRoute moduleKey="detailers"><DetailerMaster /></ProtectedRoute>} />
          <Route path="projects" element={<ProtectedRoute moduleKey="projects"><ProjectMaster /></ProtectedRoute>} />
          <Route path="steel-budget/input" element={<ProtectedRoute moduleKey="steel-budget/input"><SteelBudgetInput /></ProtectedRoute>} />
          <Route path="steel-budget/result" element={<ProtectedRoute moduleKey="steel-budget/result"><SteelBudgetResult /></ProtectedRoute>} />
          
          {/* Structural Schedule Routes */}
          <Route path="structural/plan-creation" element={<ProtectedRoute moduleKey="/structural/plan-creation"><PlanCreation /></ProtectedRoute>} />
          <Route path="structural/plan-tracking" element={<ProtectedRoute moduleKey="/structural/plan-tracking"><PlanTracking /></ProtectedRoute>} />
          
          {/* Production Management Routes */}
          <Route path="production" element={<ProtectedRoute moduleKey="/production/priority-schedule,/production/process-master"><ProductionLayout /></ProtectedRoute>}>
            <Route index element={<ProductionIndex />} />
            <Route path="priority-schedule" element={<ProtectedRoute moduleKey="/production/priority-schedule"><ProductionPrioritySchedule /></ProtectedRoute>} />
            <Route path="process-master" element={<ProtectedRoute moduleKey="/production/process-master"><ProcessMaster /></ProtectedRoute>} />
          </Route>
          <Route path="production/master-settings" element={<ProtectedRoute moduleKey="/production/priority-schedule,/production/process-master"><ProcessMasterSettings /></ProtectedRoute>} />
          <Route path="production/capacity-mapping/:tab?" element={
            <ProtectedRoute moduleKey="/production/capacity-mapping/capacity,/production/capacity-mapping/machine,/production/capacity-mapping/manpower">
              <CapacityMapping />
            </ProtectedRoute>
          } />

          {/* Integrated RFQ & Dashboards */}
          <Route path="rfq" element={<ProtectedRoute moduleKey="/rfq"><RFQLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="data-entry" replace />} />
            <Route path="data-entry" element={<DataEntryPage />} />
            <Route path="bid-performance" element={<BidPerformancePage />} />
            <Route path="dollar-dashboard" element={<DollarDashboardPage />} />
            <Route path="job-analytics" element={<JobAnalyticsPage />} />
            <Route path="sales-cycle" element={<SalesCyclePage />} />
            <Route path="capacity" element={<FutureCapacityPage />} />
          </Route>
          <Route path="rfq/print" element={<ProtectedRoute moduleKey="/rfq"><div className="rfq-scope w-full h-full"><PrintSetupPage /></div></ProtectedRoute>} />

          {/* Integrated Estimation Erection */}
          <Route path="estimation-erection" element={<ProtectedRoute moduleKey="/estimation-erection"><EstimationErectionLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="estimation" replace />} />
            <Route path="estimation" element={<EstimationModel />} />
            <Route path="erection-takeoff" element={<ErectionTakeoffTab />} />
            <Route path="fmc" element={<FieldMomentConnTab />} />
            <Route path="estimate-data" element={<EstimateDataTab />} />
            <Route path="contacts" element={<CoreTab />} />
          </Route>

          <Route path="settings" element={<ProtectedRoute moduleKey="settings"><Settings /></ProtectedRoute>} />
          <Route path="announcements" element={<ProtectedRoute moduleKey="announcements"><Announcements /></ProtectedRoute>} />
          <Route path="user-access" element={<ProtectedRoute adminOnly={true}><UserAccess /></ProtectedRoute>} />
          <Route path="agent-settings" element={<ProtectedRoute adminOnly={true}><AgentSettings /></ProtectedRoute>} />
          <Route path="help" element={<PlaceholderPage title="Help & Support" />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Router>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
    </QueryClientProvider>
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
