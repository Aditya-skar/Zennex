import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './themeContext';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import AuthLayout from './components/auth/AuthLayout';
import MobileAppFrame from './components/MobileAppFrame/MobileAppFrame';
import { AUTH_CHANGED_EVENT, isLoggedIn } from './api';
import './App.css';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => isLoggedIn());

  useEffect(() => {
    const sync = () => setIsAuthenticated(isLoggedIn());
    window.addEventListener('storage', sync);
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    window.addEventListener('simsor-auth-expired', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(AUTH_CHANGED_EVENT, sync);
      window.removeEventListener('simsor-auth-expired', sync);
    };
  }, []);

  return (
    <ThemeProvider>
      <MobileAppFrame>
        <Toaster 
          position="bottom-center" 
          toastOptions={{
            style: {
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              fontFamily: 'var(--font-family)',
              fontSize: '14px',
              boxShadow: 'var(--shadow-md)',
            }
          }} 
        />
        <BrowserRouter>
          <Routes>
            <Route 
              path="/login" 
              element={
                isAuthenticated ? (
                  <Navigate to="/" replace />
                ) : (
                  <AuthLayout />
                )
              } 
            />
            <Route 
              path="/signup" 
              element={
                isAuthenticated ? (
                  <Navigate to="/" replace />
                ) : (
                  <AuthLayout />
                )
              } 
            />
            <Route 
              path="/*" 
              element={
                isAuthenticated ? (
                  <Layout />
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />
          </Routes>
        </BrowserRouter>
      </MobileAppFrame>
    </ThemeProvider>
  );
};

export default App;
