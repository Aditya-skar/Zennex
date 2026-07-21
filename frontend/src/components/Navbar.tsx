import React from 'react';
import { Map, Home, MessageSquare, User } from 'lucide-react';
import './Navbar.css';

export type TabType = 'explore' | 'home' | 'discover' | 'chat' | 'profile';
export type MapEventScope = 'public' | 'private';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  mapEventScope?: MapEventScope;
  onMapEventScopeChange?: (scope: MapEventScope) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  mapEventScope = 'public',
  onMapEventScopeChange,
}) => {
  const navItems = [
    { id: 'explore' as TabType, label: 'Explore', icon: Map },
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'discover' as TabType, label: 'Discover', icon: null },
    { id: 'chat' as TabType, label: 'Chat', icon: MessageSquare },
    { id: 'profile' as TabType, label: 'Profile', icon: User },
  ];

  return (
    <nav className="bottom-navbar" aria-label="Main navigation">
      <div className="bottom-navbar-stack">
        {activeTab === 'explore' && onMapEventScopeChange && (
          <div className="navbar-scope-island" role="group" aria-label="Map event visibility">
            <button
              type="button"
              className={`navbar-scope-btn ${mapEventScope === 'public' ? 'active' : ''}`}
              onClick={() => onMapEventScopeChange('public')}
              aria-pressed={mapEventScope === 'public'}
            >
              Public
            </button>
            <button
              type="button"
              className={`navbar-scope-btn ${mapEventScope === 'private' ? 'active' : ''}`}
              onClick={() => onMapEventScopeChange('private')}
              aria-pressed={mapEventScope === 'private'}
            >
              Mates
            </button>
          </div>
        )}
        <div className="navbar-island">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isLogoTab = item.id === 'discover';

          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${isActive ? 'active' : ''} ${isLogoTab ? 'nav-item--logo' : ''}`}
              onClick={() => setActiveTab(item.id)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={`nav-item-surface ${isLogoTab ? 'nav-item-surface--logo' : ''}`}>
                {isLogoTab ? (
                  <img
                    src="/logo.png"
                    alt=""
                    className="nav-logo-img"
                    aria-hidden="true"
                    draggable={false}
                  />
                ) : (
                  Icon && (
                    <Icon size={20} className="nav-icon" strokeWidth={isActive ? 2.25 : 1.75} />
                  )
                )}
              </span>
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
