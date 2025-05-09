
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProfileSettings from "./pages/ProfileSettings"; // Import the new page

// Admin Routes
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminDoctors from "./pages/admin/Doctors";
import AdminMedicines from "./pages/admin/Medicines";
import AdminReports from "./pages/admin/Reports";
import AdminSettings from "./pages/admin/Settings";
import AdminMedicals from "./pages/admin/Medicals";

// MR Routes
import MRDashboard from "./pages/mr/Dashboard";
import NewVisit from "./pages/mr/NewVisit";
import Doctors from "./pages/mr/Doctors";
// import NewDoctor from "./pages/mr/NewDoctor"; // Removed import for the old page
import Visits from "./pages/mr/Visits";
import Reports from "./pages/mr/Reports";
import MedicalVisitsReportPage from "./components/reports/MedicalVisitsReportPage"; // Import the new component
import { MRMedicalsPage } from "./pages/mr/Medicals"; // Import the new MR Medicals page

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/profile-settings" element={<ProfileSettings />} /> {/* Add route for profile settings */}
          
          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/doctors" element={<AdminDoctors />} />
          <Route path="/admin/medicines" element={<AdminMedicines />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/medicals" element={<AdminMedicals />} />
          {/* Add route for Admin Medical Reports */}
          <Route path="/admin/medical-reports" element={<MedicalVisitsReportPage userRole="admin" />} />

          {/* MR Routes */}
          <Route path="/mr/dashboard" element={<MRDashboard />} />
          <Route path="/mr/visits/new" element={<NewVisit />} />
          <Route path="/mr/doctors" element={<Doctors />} />
          {/* <Route path="/mr/doctors/new" element={<NewDoctor />} /> */} {/* Removed the old route */}
          <Route path="/mr/visits" element={<Visits />} />
          <Route path="/mr/reports" element={<Reports />} />
          <Route path="/mr/medicals" element={<MRMedicalsPage />} /> {/* Add route for MR Medicals */}
          {/* Add route for MR Medical Reports */}
          <Route path="/mr/medical-reports" element={<MedicalVisitsReportPage userRole="mr" />} />

          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
