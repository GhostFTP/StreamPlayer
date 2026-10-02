import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import nyxLogo from '../assets/nyx-logo-lockup.svg';

const GOOGLE_ERRORS = {
  not_allowed: 'Your Google account is not authorized to access this app.',
  google: 'Google sign-in failed. Please try again.',
  google_not_configured: 'Google sign-in is not configured yet.',
};

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(() => GOOGLE_ERRORS[searchParams.get('error')] || '');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="login-logo">
          <img src={nyxLogo} alt="Nyx" />
        </div>
        <p className="login-subtitle">Sign in to access your media</p>

        {error && <p className="error-msg">{error}</p>}

        <input
          className="input"
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoFocus
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="login-divider">or</div>

        <a className="btn btn-google" href="/api/auth/google">
          Continue with Google
        </a>
      </form>
    </div>
  );
}
