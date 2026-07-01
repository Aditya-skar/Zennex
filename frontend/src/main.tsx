import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initMobileApp } from './mobile/initMobileApp';
import './index.css';

initMobileApp();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
