import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';
import Login from './pages/Login.jsx';
import Library from './pages/Library.jsx';
import Browse from './pages/Browse.jsx';
import SeriesDetail from './pages/SeriesDetail.jsx';
import MovieDetail from './pages/MovieDetail.jsx';
import Player from './pages/Player.jsx';
import Profile from './pages/Profile.jsx';
import Admin from './pages/Admin.jsx';
import Changelog from './pages/Changelog.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login"  element={<Login />} />
        <Route path="/"       element={<PrivateRoute><Library /></PrivateRoute>} />
        <Route path="/browse" element={<PrivateRoute><Browse /></PrivateRoute>} />
        <Route path="/movie"  element={<PrivateRoute><MovieDetail /></PrivateRoute>} />
        <Route path="/series" element={<PrivateRoute><SeriesDetail /></PrivateRoute>} />
        <Route path="/player"  element={<PrivateRoute><Player /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/admin"   element={<PrivateRoute><Admin /></PrivateRoute>} />
        <Route path="/changelog" element={<PrivateRoute><Changelog /></PrivateRoute>} />
        <Route path="*"       element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
