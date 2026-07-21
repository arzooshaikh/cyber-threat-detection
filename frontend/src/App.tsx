import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Bases from './pages/Bases';
import Threats from './pages/Threats';
import FederatedLearning from './pages/FederatedLearning';
import RunDetection from './pages/RunDetection';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/bases" element={<Bases />} />
        <Route path="/threats" element={<Threats />} />
        <Route path="/federated" element={<FederatedLearning />} />
        <Route path="/run-detection" element={<RunDetection />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;