import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Catalog from "./pages/Catalog";
import Book from "./pages/Book";
import MyLoans from "./pages/MyLoans";
import ChangePassword from "./pages/ChangePassword";
import Dashboard from "./pages/admin/Dashboard";
import Books from "./pages/admin/Books";
import Members from "./pages/admin/Members";
import Circulation from "./pages/admin/Circulation";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Logged-in pages (any role) — wrapped in Layout (navbar). */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/catalog/:id" element={<Book />} />
            <Route path="/my-loans" element={<MyLoans />} />
            <Route path="/change-password" element={<ChangePassword />} />
          </Route>

          {/* Admin-only pages. */}
          <Route
            element={
              <ProtectedRoute role="admin">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/books" element={<Books />} />
            <Route path="/admin/members" element={<Members />} />
            <Route path="/admin/circulation" element={<Circulation />} />
          </Route>

          {/* Default: send to catalog (which bounces to login if needed). */}
          <Route path="*" element={<Navigate to="/catalog" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
