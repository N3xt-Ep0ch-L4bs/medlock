import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/landingpage";
import Doctor from "./pages/doctor";
import DoctorRegistration from "./pages/DoctorRegistration";
import Login from "./pages/login";
import PharmacyHistory from "./pages/PharmacyHistory";
import About from "./pages/about";
import How from "./pages/how";
import PharmacyDashboard from "./pages/pharmacy";
import PharmacyRegistration from "./pages/PharmacyRegistration";
import Dashboard from "./pages/dashboard/index";
import DashboardHome from "./pages/dashboard/DashboardHome";
import DashboardRecords from "./pages/dashboard/DashboardRecords";
import DashboardPrescriptions from "./pages/dashboard/DashboardPrescriptions";
import DashboardShared from "./pages/dashboard/DashboardShared";
import DashboardActivity from "./pages/dashboard/DashboardActivity";
import DashboardSettings from "./pages/dashboard/DashboardSettings";
import AdminDashboard from "./pages/admin/AdminDashboard";
import OrganizationDashboard from "./pages/organization";
import OrganizationRegistration from "./pages/OrganizationRegistration";
import Support from "./pages/support";
import LearnMore from "./pages/learnmore";
import "./App.css";
import { EnokiProvider } from "./providers/EnokiProvider";

function App() {
  return (
    <EnokiProvider>
      <Router>
        <Routes>
          
          <Route path="/" element={<LandingPage />} />
          <Route path="/howitworks" element={<How />} />
          <Route path="/learnmore" element={<LearnMore />} />
          <Route path="/about" element={<About />} />
          <Route path="/support" element={<Support />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />}>
            <Route index element={<DashboardHome />} />
            <Route path="records" element={<DashboardRecords />} />
            <Route path="prescriptions" element={<DashboardPrescriptions />} />
            <Route path="shared" element={<DashboardShared />} />
            <Route path="activity" element={<DashboardActivity />} />
            <Route path="settings" element={<DashboardSettings />} />
          </Route>
          <Route path="/doctor" element={<Doctor />} />
          <Route path="/doctor/registration" element={<DoctorRegistration />} />
          <Route path="/pharmacy" element={<PharmacyDashboard />} />
          <Route path="/pharmacy/registration" element={<PharmacyRegistration />} />
          <Route path="/pharmacyHistory" element={<PharmacyHistory />} />
          <Route path="/organization" element={<OrganizationDashboard />} />
          <Route path="/organization/registration" element={<OrganizationRegistration />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </Router>
    </EnokiProvider>
  );
}

export default App;

