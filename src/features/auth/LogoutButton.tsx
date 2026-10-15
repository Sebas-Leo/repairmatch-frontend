import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from './authContext';

export function LogoutButton() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    await logout();
    // Leave the protected area without a "return here" location: signing out
    // is deliberate, unlike an expired session.
    navigate('/login', { replace: true });
  }

  return (
    <button type="button" onClick={handleClick} disabled={pending}>
      Sign out
    </button>
  );
}
