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
