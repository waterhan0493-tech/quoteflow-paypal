import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { BookingPage } from './booking/BookingPage.tsx';
import { Dashboard } from './dashboard/Dashboard.tsx';
import { Landing } from './landing/Landing.tsx';
import './index.css';

// Routes: / landing · /dashboard owner · /b/<slug> customer booking · /classic the original Bolt demo.
function route(path: string): ReactNode {
  const booking = path.match(/^\/b\/([a-z0-9-]+)\/?$/i);
  if (booking) return <BookingPage slug={booking[1].toLowerCase()} />;
  if (/^\/dashboard\/?$/.test(path)) return <Dashboard />;
  if (/^\/classic\/?$/.test(path)) return <App />;
  return <Landing />;
}

createRoot(document.getElementById('root')!).render(<StrictMode>{route(window.location.pathname)}</StrictMode>);
