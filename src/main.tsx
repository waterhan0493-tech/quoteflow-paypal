import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { BookingPage } from './booking/BookingPage.tsx';
import './index.css';

// Customer booking pages live at /b/<business-slug>; everything else is the owner app.
const bookingMatch = window.location.pathname.match(/^\/b\/([a-z0-9-]+)\/?$/i);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {bookingMatch ? <BookingPage slug={bookingMatch[1].toLowerCase()} /> : <App />}
  </StrictMode>
);
