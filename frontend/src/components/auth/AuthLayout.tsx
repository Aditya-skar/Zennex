import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme } from '../../themeContext';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import './AuthLayout.css';

export const AuthLayout: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = location.pathname === '/signup' ? 'signup' : 'login';

  const handleTabChange = (tab: 'login' | 'signup') => {
    navigate(tab === 'signup' ? '/signup' : '/login');
  };

  return (
    <div className="zenex-auth-shell">
      {/* Dynamic atmospheric mesh background */}
      <div className="zenex-auth-ambient" aria-hidden />

      <div className="zenex-auth-frame">
        {/* Top bar with quick theme toggle */}
        <header className="zenex-auth-topbar">
          <div className="zenex-auth-pill-badge">
            <Sparkles size={13} className="zenex-auth-badge-icon" />
            <span>Community Platform</span>
          </div>

          <button
            type="button"
            className="zenex-auth-theme-btn"
            onClick={toggleTheme}
            aria-label="Toggle light/dark theme"
            title="Toggle theme"
          >
            {theme === 'light' ? <Moon size={16} strokeWidth={2.2} /> : <Sun size={16} strokeWidth={2.2} />}
          </button>
        </header>

        {/* Central Brand Identity */}
        <div className="zenex-auth-hero">
          <div className="zenex-auth-logo-orbit">
            <div className="zenex-auth-logo-glow" aria-hidden />
            <div className="zenex-auth-logo-badge">
              <img src="/logo.png" alt="Zenex" className="zenex-auth-logo-img" />
            </div>
          </div>
          <h1 className="zenex-auth-brand-name">ZENEX</h1>
          <p className="zenex-auth-brand-tagline">Sports · Events · Communities</p>
        </div>

        {/* Pill Segmented Switcher */}
        <div className="zenex-auth-pill-tabs" role="tablist" aria-label="Auth tabs">
          <div className={`zenex-auth-pill-slider ${activeTab === 'signup' ? 'is-signup' : 'is-login'}`} />
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'login'}
            className={`zenex-auth-pill-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => handleTabChange('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'signup'}
            className={`zenex-auth-pill-tab ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => handleTabChange('signup')}
          >
            Sign Up
          </button>
        </div>

        {/* Seamless Blended Form Panel */}
        <main className="zenex-auth-body">
          {activeTab === 'login' ? (
            <LoginPage />
          ) : (
            <SignupPage onBackToLogin={() => handleTabChange('login')} />
          )}
        </main>

        {/* Subtle footer credit */}
        <footer className="zenex-auth-footer">
          <span>Protected by Zenex Trust & Safety</span>
        </footer>
      </div>
    </div>
  );
};

export default AuthLayout;
