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
import ProductionPrioritySchedule from './pages/Production/ProductionPrioritySchedule';
import ProcessMaster from './pages/Production/ProcessMaster';
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

// ── Estimation Erection Imports ──────────────────────────────────────────────
import EstimationErectionLayout from './pages/EstimationErection/EstimationErectionLayout';
import ErectionTakeoffTab from './pages/EstimationErection/ErectionTakeoffTab';
import FieldMomentConnTab from './pages/EstimationErection/FieldMomentConnTab';
import MiscMetalsTab from './pages/EstimationErection/MiscMetalsTab';
import BreakdownTab from './pages/EstimationErection/BreakdownTab';
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
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="estimation" element={<Navigate to="/estimation-erection/estimation" replace />} />
          <Route path="estimation-summary" element={<EstimationSummary />} />
          
          {/* Bid Management Routes */}
          <Route path="bids/enquiry" element={<BidEnquiry />} />
          <Route path="bids/schedule" element={<InternalBidSchedule />} />

          <Route path="employees" element={<EmployeeMaster />} />
          <Route path="customers" element={<CustomerMaster />} />
          <Route path="detailers" element={<DetailerMaster />} />
          <Route path="projects" element={<ProjectMaster />} />
          <Route path="steel-budget/input" element={<SteelBudgetInput />} />
          <Route path="steel-budget/result" element={<SteelBudgetResult />} />
          
          {/* Structural Schedule Routes */}
          <Route path="structural/plan-creation" element={<PlanCreation />} />
          <Route path="structural/plan-tracking" element={<PlanTracking />} />
          
          {/* Production Management Routes */}
          <Route path="production/process-master" element={<ProcessMaster />} />
          <Route path="production/priority-schedule" element={<ProductionPrioritySchedule />} />
          <Route path="production/capacity-mapping/:tab?" element={<CapacityMapping />} />

          {/* Integrated RFQ & Dashboards */}
          <Route path="rfq" element={<RFQLayout />}>
            <Route index element={<Navigate to="data-entry" replace />} />
            <Route path="data-entry" element={<DataEntryPage />} />
            <Route path="bid-performance" element={<BidPerformancePage />} />
            <Route path="dollar-dashboard" element={<DollarDashboardPage />} />
            <Route path="job-analytics" element={<JobAnalyticsPage />} />
            <Route path="sales-cycle" element={<SalesCyclePage />} />
            <Route path="capacity" element={<FutureCapacityPage />} />
          </Route>
          <Route path="rfq/print" element={<div className="rfq-scope w-full h-full"><PrintSetupPage /></div>} />

          {/* Integrated Estimation Erection */}
          <Route path="estimation-erection" element={<EstimationErectionLayout />}>
            <Route index element={<Navigate to="estimation" replace />} />
            <Route path="estimation" element={<EstimationModel />} />
            <Route path="erection-takeoff" element={<ErectionTakeoffTab />} />
            <Route path="fmc" element={<FieldMomentConnTab />} />
            <Route path="misc-metals" element={<MiscMetalsTab />} />
            <Route path="breakdown" element={<BreakdownTab />} />
            <Route path="estimate-data" element={<EstimateDataTab />} />
            <Route path="contacts" element={<CoreTab />} />
          </Route>


          <Route path="settings" element={<Settings />} />
          <Route path="announcements" element={<Announcements />} />
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
