import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import { migrateFromV1 } from './utils/storage/migration';
import './styles/index.css';

// Migration v1 → v2 avant le premier rendu : les clés v1 sont conservées et sauvegardées.
try {
  migrateFromV1();
} catch (error) {
  console.error('Migration v1 impossible ; les données v1 restent intactes.', error);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
);
