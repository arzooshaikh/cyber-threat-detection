import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Bases from './pages/Bases';
import Threats from './pages/Threats';
import FederatedLearning from './pages/FederatedLearning';
import RunDetection from './pages/RunDetection';
import ThreatResponse from './pages/ThreatResponse';
import Login from './pages/Login';

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/bases" element={<ProtectedRoute><Bases /></ProtectedRoute>} />
        <Route path="/threats" element={<ProtectedRoute><Threats /></ProtectedRoute>} />
        <Route path="/federated" element={<ProtectedRoute><FederatedLearning /></ProtectedRoute>} />
        <Route path="/run-detection" element={<ProtectedRoute><RunDetection /></ProtectedRoute>} />
        <Route path="/threat-response" element={<ProtectedRoute><ThreatResponse /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
