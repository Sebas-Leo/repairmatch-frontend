import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { useAuth } from '../features/auth/authContext';
import { resolvePostLoginTarget } from '../features/auth/redirects';
import {
  isRole,
  PASSWORD_MAX,
  PASSWORD_MIN,
  validateRegister,
  type RegisterValues,
} from '../features/auth/validation';
import { RegistrationSignInError } from '../shared/auth/session';
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
  { name: 'name', id: 'register-name', label: 'Name' },
  { name: 'email', id: 'register-email', label: 'Email' },
  { name: 'password', id: 'register-password', label: 'Password' },
  { name: 'role', id: 'register-role-client', label: 'Account type' },
];

const ROLE_OPTIONS = [
  {
    value: 'CLIENT',
    id: 'register-role-client',
    label: 'Client: I need something repaired',
  },
  {
    value: 'TECHNICIAN',
    id: 'register-role-technician',
    label: 'Technician: I repair appliances',
  },
] as const;

export function RegisterPage() {
  const auth = useAuth();
  const location = useLocation();
  const { feedback, summaryRef, show, clear } = useFormFeedback();
  const [values, setValues] = useState<RegisterValues>({
    name: '',
    email: '',
    password: '',
    role: '',
  });
  const { run: submit, isSubmitting } = useSubmitGuard(async () => {
    const errors = validateRegister(values);
    if (Object.keys(errors).length > 0 || !values.role) {
      show({ fieldErrors: errors });
      return;
    }
    clear();
    try {
      await auth.register({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        role: values.role,
      });
    } catch (error) {
      if (error instanceof RegistrationSignInError) {
        show({
          message:
            'Your account was created, but we could not sign you in. Try signing in from the sign-in page.',
          fieldErrors: {},
        });
      } else {
        show(feedbackFromError(error));
      }
    }
  });

  if (auth.status === 'loading') {
    return <LoadingState label="Checking your session…" />;
  }
  if (auth.status === 'authenticated') {
    return (
      <Navigate
        to={resolvePostLoginTarget(location.state, auth.user.role)}
        replace
      />
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  const fieldError = (name: string) => feedback?.fieldErrors[name];
  const roleError = fieldError('role');

  return (
    <section aria-labelledby="register-title" className="auth-page">
      <h1 id="register-title">Create your account</h1>
      {feedback && hasFeedback(feedback) ? (
        <FormErrorSummary
          ref={summaryRef}
          feedback={feedback}
          fields={FIELDS}
        />
      ) : null}
      <form onSubmit={handleSubmit} noValidate className="form">
        <fieldset disabled={isSubmitting} className="form-fields">
          <legend className="visually-hidden">Registration details</legend>
          <TextField
            id="register-name"
            name="name"
            label="Name"
            autoComplete="name"
            value={values.name}
            onChange={(event) =>
              setValues({ ...values, name: event.target.value })
            }
            error={fieldError('name')}
          />
          <TextField
            id="register-email"
            name="email"
            type="email"
            label="Email"
            autoComplete="email"
            value={values.email}
            onChange={(event) =>
              setValues({ ...values, email: event.target.value })
            }
            error={fieldError('email')}
          />
          <TextField
            id="register-password"
            name="password"
            type="password"
            label="Password"
            autoComplete="new-password"
            hint={`${PASSWORD_MIN} to ${PASSWORD_MAX} characters with an uppercase letter, a lowercase letter, a number and a symbol.`}
            value={values.password}
            onChange={(event) =>
              setValues({ ...values, password: event.target.value })
            }
            error={fieldError('password')}
          />
          <fieldset
            className="radio-group"
            aria-describedby={roleError ? 'register-role-error' : undefined}
          >
            <legend>Account type</legend>
            {ROLE_OPTIONS.map((option) => (
              <label key={option.value} htmlFor={option.id} className="radio">
                <input
                  type="radio"
                  id={option.id}
                  name="role"
                  value={option.value}
                  checked={values.role === option.value}
                  aria-invalid={roleError ? true : undefined}
                  onChange={(event) => {
                    if (isRole(event.target.value)) {
                      setValues({ ...values, role: event.target.value });
                    }
                  }}
                />{' '}
                {option.label}
              </label>
            ))}
            {roleError ? (
              <p id="register-role-error" className="field-error">
                {roleError}
              </p>
            ) : null}
          </fieldset>
          <button type="submit" aria-busy={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </fieldset>
      </form>
      <p>
        Already have an account?{' '}
        <Link to="/login" state={location.state}>
          Sign in
        </Link>
      </p>
    </section>
  );
}
