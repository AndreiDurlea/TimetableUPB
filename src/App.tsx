import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Timetable from './pages/Timetable';
import Profile from './pages/Profile';
import ProtectedRoute from './components/features/generics/ProtectedRoute.tsx';
import AddEntryPage from './pages/AddEntryPage';
import SharePage from './pages/Share.tsx';
import NotFoundPage from './pages/NotFound.tsx';
import { useAuth } from './hooks/auth/useAuth.ts';
import './App.css';

const LoginRedirect: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const hasRedirected = React.useRef(false);

  useEffect(() => {
    if (user && !hasRedirected.current) {
      hasRedirected.current = true;
      navigate('/profile');
    }
  }, [user, navigate]);

  return null;
};

function App() {
  return (
    <Router>
      <LoginRedirect />
      <Routes>
        <Route path="/" element={<Timetable />} />
        <Route path="/share/:hierarchy" element={<SharePage />} />
        <Route element={<ProtectedRoute requiresAuth={true} requiresProfileComplete={false} />}>
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route element={<ProtectedRoute requiresAuth={true} requiresProfileComplete={false} />}>
          <Route path="/add" element={<AddEntryPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;
