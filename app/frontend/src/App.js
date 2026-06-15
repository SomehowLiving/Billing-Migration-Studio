import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import DataSources from "./pages/DataSources";
import Mappings from "./pages/Mappings";
import Migrations from "./pages/Migrations";
import NewMigration from "./pages/NewMigration";
import MigrationDetail from "./pages/MigrationDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { AuthProvider } from "./context/AuthContext";
import Customers from "./pages/Customers";
import Onboarding from "./pages/Onboarding";
import OnboardingDetail from "./pages/OnboardingDetail";

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/share/:token" element={<OnboardingDetail publicMode />} />
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/sources" element={<DataSources />} />
                  <Route path="/mappings" element={<Mappings />} />
                  <Route path="/migrations" element={<Migrations />} />
                  <Route path="/migrations/new" element={<NewMigration />} />
                  <Route path="/migrations/:id" element={<MigrationDetail />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/onboarding/:id" element={<OnboardingDetail />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
