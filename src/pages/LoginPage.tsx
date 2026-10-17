import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { useAuth } from '../features/auth/authContext';
import { resolvePostLoginTarget } from '../features/auth/redirects';
import { validateLogin } from '../features/auth/validation';
import { useReportFormError } from '../shared/hooks/useReportFormError';
import {
  FormErrorSummary,
  type SummaryField,
} from '../shared/ui/FormErrorSummary';
import { hasFeedback, useFormFeedback } from '../shared/ui/formFeedback';
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
  const reportError = useReportFormError(show);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const errors = validateLogin({ email, password });
    if (Object.keys(errors).length > 0) {
      show({ fieldErrors: errors as Record<string, string> });
      return;
    }
    clear();
    setSubmitting(true);
    try {
      await auth.login({ email: email.trim(), password });
    } catch (error) {
      reportError(error);
      setSubmitting(false);
    }
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
        <fieldset disabled={submitting} className="form-fields">
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
          <button type="submit" aria-busy={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
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
