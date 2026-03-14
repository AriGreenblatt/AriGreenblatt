import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/config/app.config';
import { AppComponent } from './app/app.component/app.component';

// Disable service worker registration completely
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  // Prevent any service worker registration
  Object.defineProperty(navigator, 'serviceWorker', {
    value: undefined,
    writable: false
  });
}

// Suppress all service worker related errors
if (typeof window !== 'undefined') {
  const originalError = console.error;
  window.addEventListener('error', (event) => {
    if (event.message && (event.message.includes('service worker') || event.message.includes('ServiceWorker'))) {
      event.preventDefault();
      return;
    }
  });
  
  console.error = (...args) => {
    const message = args.join(' ');
    if (message.includes('service worker') || message.includes('ServiceWorker') || message.includes('webview')) {
      return;
    }
    originalError.apply(console, args);
  };
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => {
    if (!err.message?.includes('service worker') && !err.message?.includes('ServiceWorker')) {
      console.error('Application bootstrap error:', err);
    }
  });
