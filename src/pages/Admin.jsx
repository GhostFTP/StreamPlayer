import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Navbar from '../components/Navbar.jsx';

export default function Admin() {
  const { token, username: self } = useAuth();
  const navigate = useNavigate();

  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const [newUser,  setNewUser]  = useState({ username: '', password: '', role: 'user' });
  const [addErr,   setAddErr]   = useState(null);
  const [adding,   setAdding]   = useState(false);

  async function fetchUsers() {
    try {
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Forbidden');
      setUsers(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setAdding(true); setAddErr(null);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewUser({ username: '', password: '', role: 'user' });
      await fetchUsers();
    } catch (e) {
      setAddErr(e.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(username) {
    if (!confirm(`Delete user "${username}"?`)) return;
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchUsers();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <>
      <Navbar />
      <div className="admin-page">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <h1 className="admin-title">User Management</h1>

        {loading ? (
          <div className="loading">Loading…</div>
        ) : error ? (
          <div className="error-msg">{error}</div>
        ) : (
          <div className="admin-user-list">
            {users.map(u => (
              <div key={u.username} className="admin-user-row">
                <span className="admin-user-avatar">{u.username[0].toUpperCase()}</span>
                <span className="admin-user-name">{u.username}</span>
                <span className={`profile-role-badge${u.role === 'admin' ? ' admin' : ''}`}>
                  {u.role === 'admin' ? 'Admin' : 'User'}
                </span>
                <button
                  className="admin-delete-btn"
                  onClick={() => handleDelete(u.username)}
                  disabled={u.username === self}
                  title={u.username === self ? 'Cannot delete yourself' : `Delete ${u.username}`}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="profile-section" style={{ marginTop: '2rem' }}>
          <h2 className="profile-section-title">Add User</h2>
          <form className="profile-form" onSubmit={handleAdd}>
            <input
              className="input"
              type="text"
              placeholder="Username"
              value={newUser.username}
              onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))}
              required
            />
            <input
              className="input"
              type="password"
              placeholder="Password"
              value={newUser.password}
              onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
              required
              minLength={6}
            />
            <select
              className="input"
              value={newUser.role}
              onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            {addErr && <p className="error-msg">{addErr}</p>}
            <button className="btn" type="submit" disabled={adding}>
              {adding ? 'Adding…' : 'Add User'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
