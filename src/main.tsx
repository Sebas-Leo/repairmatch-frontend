import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { createAppRouter } from './app/router';
import { AuthProvider } from './features/auth/AuthProvider';
import { appSession } from './shared/auth/appSession';
import './app/styles.css';

// Importing `appSession` validates the public API configuration before rendering.
const root = document.getElementById('root');
if (!root) throw new Error('Missing application root');

createRoot(root).render(
  <StrictMode>
    <AuthProvider session={appSession}>
      <RouterProvider router={createAppRouter()} />
    </AuthProvider>
  </StrictMode>,
);
