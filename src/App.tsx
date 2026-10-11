import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Timetable from './pages/Timetable';
import Profile from './pages/Profile';
import ProtectedRoute from './components/features/generics/ProtectedRoute.tsx';
import AddEntryPage from './pages/AddEntryPage';
import NotFoundPage from './pages/NotFound.tsx';
import Privacy from './pages/Privacy.tsx';
import ShareProfile from './pages/ShareProfile.tsx';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Timetable />} />
        <Route path="/share/:hierarchy" element={<Timetable />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route element={<ProtectedRoute requiresAuth={true} requiresProfileComplete={false} />}>
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route element={<ProtectedRoute requiresAuth={true} requiresProfileComplete={false} />}>
          <Route path="/share-profile" element={<ShareProfile />} />
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
