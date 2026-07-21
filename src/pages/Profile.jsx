import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Navbar from '../components/Navbar.jsx';

export default function Profile() {
  const { username, role, token } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirm,         setConfirm]         = useState('');
  const [status,          setStatus]          = useState(null); // { type: 'ok'|'err', msg }
  const [loading,         setLoading]         = useState(false);

  async function handleChangePassword(e) {
    e.preventDefault();
    if (newPassword !== confirm) {
      setStatus({ type: 'err', msg: 'New passwords do not match' });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus({ type: 'ok', msg: 'Password changed successfully' });
      setCurrentPassword(''); setNewPassword(''); setConfirm('');
    } catch (err) {
      setStatus({ type: 'err', msg: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="profile-page">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>

        <div className="profile-card">
          <div className="profile-avatar-lg">
            {username?.[0]?.toUpperCase()}
          </div>
          <h1 className="profile-username">{username}</h1>
          <span className={`profile-role-badge${role === 'admin' ? ' admin' : ''}`}>
            {role === 'admin' ? 'Admin' : 'User'}
          </span>
        </div>

        <div className="profile-section">
          <h2 className="profile-section-title">Change Password</h2>
          <form className="profile-form" onSubmit={handleChangePassword}>
            <input
              className="input"
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
            />
            <input
              className="input"
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
            <input
              className="input"
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
            {status && (
              <p className={status.type === 'ok' ? 'profile-ok' : 'error-msg'}>
                {status.msg}
              </p>
            )}
            <button className="btn" type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
