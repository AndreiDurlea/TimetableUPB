import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Timetable from './pages/Timetable';
import Profile from './pages/Profile';
import ProtectedRoute from './components/features/generics/ProtectedRoute.tsx';
import AddEntryPage from './pages/AddEntryPage';
import SharePage from './pages/Share.tsx';
import NotFoundPage from './pages/NotFound.tsx';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Route for Timetable - requires profile completion */}
        <Route path="/" element={<Timetable />} />

        {/* Route for sharing timetables */}
        <Route path="/share/:hierarchy" element={<SharePage />} />

        {/* Route for Profile - requires auth */}
        <Route element={<ProtectedRoute requiresAuth={true} requiresProfileComplete={true} />}>
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Route for Add Entry Page - requires auth */}
        <Route element={<ProtectedRoute requiresAuth={true} requiresProfileComplete={false} />}>
          <Route path="/add" element={<AddEntryPage />} />
        </Route>

        {/* 404 Not Found Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;
