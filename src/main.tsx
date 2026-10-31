import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BookingPage } from './booking/BookingPage.tsx';
import { Dashboard } from './dashboard/Dashboard.tsx';
import { Landing } from './landing/Landing.tsx';
import { PayPage } from './pay/PayPage.tsx';
import './index.css';

// Routes: / landing · /dashboard owner · /b/<slug> customer booking · /pay/<booking id> balance payment.
function route(path: string): ReactNode {
  const booking = path.match(/^\/b\/([a-z0-9-]+)\/?$/i);
  if (booking) return <BookingPage slug={booking[1].toLowerCase()} />;
  if (/^\/dashboard\/?$/.test(path)) return <Dashboard />;
  const pay = path.match(/^\/pay\/([0-9a-f-]{36})\/?$/i);
  if (pay) return <PayPage id={pay[1].toLowerCase()} />;
  return <Landing />;
}

createRoot(document.getElementById('root')!).render(<StrictMode>{route(window.location.pathname)}</StrictMode>);
