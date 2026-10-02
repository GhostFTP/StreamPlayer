import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const username = searchParams.get('username');
    const role = searchParams.get('role');
    if (!token || !username) {
      navigate('/login?error=google');
      return;
    }
    loginWithToken(token, username, role);
    navigate('/');
  }, [searchParams, loginWithToken, navigate]);

  return null;
}
