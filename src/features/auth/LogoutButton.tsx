import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../shared/ui/Button';
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
    <Button
      variant="secondary"
      size="sm"
      onClick={handleClick}
      loading={pending}
      icon={<LogOut size={16} aria-hidden="true" />}
    >
      Sign out
    </Button>
  );
}
