import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { useAuth } from '../features/auth/authContext';
import { resolvePostLoginTarget } from '../features/auth/redirects';
import { validateLogin } from '../features/auth/validation';
import type { LoginRequest } from '../shared/api/types';
import { useSubmitGuard } from '../shared/hooks/useSubmitGuard';
import {
  FormErrorSummary,
  type SummaryField,
} from '../shared/ui/FormErrorSummary';
import {
  feedbackFromError,
  hasFeedback,
  useFormFeedback,
} from '../shared/ui/formFeedback';
import { LoadingState } from '../shared/ui/LoadingState';
import { TextField } from '../shared/ui/TextField';

const FIELDS: readonly SummaryField[] = [
  { name: 'email', id: 'login-email', label: 'Email' },
  { name: 'password', id: 'login-password', label: 'Password' },
];

export function LoginPage() {
  const auth = useAuth();
  const location = useLocation();
  const { feedback, summaryRef, show, clear } = useFormFeedback();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { run: submit, isSubmitting } = useSubmitGuard(
    async (credentials: LoginRequest) => {
      clear();
      try {
        await auth.login(credentials);
      } catch (error) {
        show(feedbackFromError(error));
      }
    },
  );

  if (auth.status === 'loading') {
    return <LoadingState label="Checking your session…" />;
  }
  if (auth.status === 'authenticated') {
    // Also covers a successful submit: the session flips to authenticated.
    return (
      <Navigate
        to={resolvePostLoginTarget(location.state, auth.user.role)}
        replace
      />
    );
  }

  // Validation happens before the submit guard, so an invalid form never
  // flashes the busy state.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateLogin({ email, password });
    if (Object.keys(errors).length > 0) {
      show({ fieldErrors: errors as Record<string, string> });
      return;
    }
    void submit({ email: email.trim(), password });
  }

  return (
    <section aria-labelledby="login-title" className="auth-page">
      <h1 id="login-title">Sign in</h1>
      {feedback && hasFeedback(feedback) ? (
        <FormErrorSummary
          ref={summaryRef}
          feedback={feedback}
          fields={FIELDS}
        />
      ) : null}
      <form onSubmit={handleSubmit} noValidate className="form">
        <fieldset disabled={isSubmitting} className="form-fields">
          <legend className="visually-hidden">Sign-in details</legend>
          <TextField
            id="login-email"
            name="email"
            type="email"
            label="Email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={feedback?.fieldErrors.email}
          />
          <TextField
            id="login-password"
            name="password"
            type="password"
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={feedback?.fieldErrors.password}
          />
          <button type="submit" aria-busy={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </fieldset>
      </form>
      <p>
        Need an account?{' '}
        <Link to="/register" state={location.state}>
          Register
        </Link>
      </p>
    </section>
  );
}
