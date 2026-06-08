import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Bell, MapPin, Calendar, Clock, Settings, Sun, Moon, X, ChevronDown } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { toast } from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import './ExplorePage.css';
import './eventMapIcons.css';
import { createEventMapIcon, SPORTS_CATEGORIES, ENTERTAINMENT_CATEGORIES } from './eventMapIcons';
import { EventMapPopup } from './EventMapPopup';
import {
  INITIAL_EVENTS,
  loadExploreEvents,
  getEventOrganizer,
  type ExploreEvent,
  openEventInGoogleMaps,
} from './exploreEvents';
import { useTheme } from '../../themeContext';

const HYDERABAD_CENTER: [number, number] = [17.3969, 78.4692];

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Sample events across all sports & entertainment categories – see exploreEvents.ts

type ExplorePageProps = {
  onViewOrganizerProfile?: (organizerId: string) => void;
};

function EventMarker({
  event,
  isSelected,
  onSelect,
  children,
}: {
  event: ExploreEvent;
  isSelected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    if (isSelected) {
      markerRef.current?.openPopup();
    }
  }, [isSelected]);

  return (
    <Marker
      ref={markerRef}
      position={event.coordinates}
      icon={createEventMapIcon(event.category, isSelected)}
      eventHandlers={{ click: onSelect }}
    >
      {children}
    </Marker>
  );
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 1.0 });
  }, [center, zoom, map]);
  return null;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({ onViewOrganizerProfile }) => {
  const { theme, toggleTheme } = useTheme();

  // Load events
  const [events, setEvents] = useState<ExploreEvent[]>(() => loadExploreEvents());

  // Toggles for iOS Floating Panels
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Create Event state removed from Explore page

  // Search filter and query state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMainCategory, setActiveMainCategory] = useState<'Sports' | 'Entertainment'>('Sports');
  const [activeSubFilter, setActiveSubFilter] = useState<string | null>(null);
  const [isMainDropdownOpen, setIsMainDropdownOpen] = useState(false);
  const filterBarRef = useRef<HTMLDivElement>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('zenex-recent-searches-v3');
    return saved ? JSON.parse(saved) : [];
  });

  // Map viewport panning controller
  const [mapCenter, setMapCenter] = useState<[number, number]>(HYDERABAD_CENTER);
  const [mapZoom, setMapZoom] = useState<number>(11);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Settings mock toggles
  const [showRadiusBoundary, setShowRadiusBoundary] = useState(false);
  const [enableMapTraffic, setEnableMapTraffic] = useState(false);
  const [enableMapSatellite, setEnableMapSatellite] = useState(false);

  // Autofocus ref for search
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when panel opens
  useEffect(() => {
    if (isSearchOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  // Escape Key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
        setIsSettingsOpen(false);
        setIsMainDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close main category dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setIsMainDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('zenex-explore-events-v4', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('zenex-recent-searches-v3', JSON.stringify(recentSearches));
  }, [recentSearches]);

  // Handle Search Submission
  const handleSearchSubmit = (term: string) => {
    setSearchQuery(term);
    if (term.trim()) {
      setRecentSearches(prev => {
        const filtered = prev.filter(item => item.toLowerCase() !== term.toLowerCase());
        return [term, ...filtered].slice(0, 5); // Keep top 5
      });
    }
    setIsSearchOpen(false); // Close search panel to view results on map
  };

  // Clear Recent Searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
  };

  // Quick Filter tag clicks
  const handleQuickFilterClick = (filter: string) => {
    setSearchQuery(filter);
    
    // Add to recent searches
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== filter.toLowerCase());
      return [filter, ...filtered].slice(0, 5);
    });
    
    setIsSearchOpen(false);
  };

  // Select Trending Event
  const handleSelectTrendingEvent = (event: ExploreEvent) => {
    setMapCenter(event.coordinates);
    setMapZoom(14);
    setSelectedEventId(event.id);
    setIsSearchOpen(false);
  };

  const handleJoinEvent = (event: ExploreEvent) => {
    toast.success(`You joined "${event.title}"!`, { icon: '🎉' });
  };

  const handleOpenLocation = (event: ExploreEvent) => {
    openEventInGoogleMaps(event);
  };

  const handleOrganizerClick = (event: ExploreEvent) => {
    const organizer = getEventOrganizer(event);
    if (onViewOrganizerProfile) {
      onViewOrganizerProfile(organizer.id);
      return;
    }
    toast('Open Discover to view organizer profiles', { icon: '👤' });
  };

  const quickFilterCategories = [...SPORTS_CATEGORIES, ...ENTERTAINMENT_CATEGORIES];

  const subFilterOptions =
    activeMainCategory === 'Sports' ? [...SPORTS_CATEGORIES] : [...ENTERTAINMENT_CATEGORIES];

  const subFilterLabel = (category: string) => {
    if (category === 'Music') return 'Music / DJ';
    return category;
  };

  const handleMainCategoryChange = (category: 'Sports' | 'Entertainment') => {
    setActiveMainCategory(category);
    setActiveSubFilter(null);
    setIsMainDropdownOpen(false);
  };

  // Filter events by category + search query
  const filteredEvents = useMemo(() => {
    return events.filter((event: ExploreEvent) => {
      if (event.mainCategory !== activeMainCategory) return false;
      if (activeSubFilter && event.category !== activeSubFilter) return false;

      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        event.title.toLowerCase().includes(query) ||
        event.venue.toLowerCase().includes(query) ||
        event.category.toLowerCase().includes(query)
      );
    });
  }, [events, searchQuery, activeMainCategory, activeSubFilter]);

  return (
    <div className="explore-container-fullscreen ios-theme">

      {/* 90-95% screen map viewport */}
      <div className="map-view-hero">
        <MapContainer
          center={HYDERABAD_CENTER}
          zoom={11}
          scrollWheelZoom={true}
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />

          {showRadiusBoundary && (
            <Circle
              center={HYDERABAD_CENTER}
              radius={10000}
              pathOptions={{
                color: theme === 'dark' ? '#E9DCBE' : '#0071E3',
                fillColor: theme === 'dark' ? '#E9DCBE' : '#0071E3',
                fillOpacity: 0.05,
                weight: 1.5,
                dashArray: '5, 8',
              }}
            />
          )}

          {filteredEvents.map((event) => {
            const isSelected = selectedEventId === event.id;

            return (
              <EventMarker
                key={event.id}
                event={event}
                isSelected={isSelected}
                onSelect={() => setSelectedEventId(event.id)}
              >
                <Popup closeButton={false} minWidth={260} maxWidth={280}>
                  <EventMapPopup
                    event={event}
                    onJoin={() => handleJoinEvent(event)}
                    onLocation={() => handleOpenLocation(event)}
                    onOrganizerClick={() => handleOrganizerClick(event)}
                  />
                </Popup>
              </EventMarker>
            );
          })}

          <MapController center={mapCenter} zoom={mapZoom} />
        </MapContainer>
      </div>

      {/* TOP-LEFT FILTER BAR */}
      <div
        ref={filterBarRef}
        className={`explore-filter-bar explore-filter-bar--${activeMainCategory.toLowerCase()} animate-scaleIn`}
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="explore-filter-main">
          <div className="explore-filter-row explore-filter-row--top">
            <div className="explore-filter-dropdown-wrap">
              <button
                type="button"
                className="explore-filter-dropdown-btn"
                onClick={() => setIsMainDropdownOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={isMainDropdownOpen}
              >
                <span>{activeMainCategory}</span>
                <ChevronDown size={14} className={`explore-filter-chevron ${isMainDropdownOpen ? 'open' : ''}`} />
              </button>
              {isMainDropdownOpen && (
                <div className="explore-filter-dropdown-menu" role="listbox">
                  <button
                    type="button"
                    className={`explore-filter-dropdown-item ${activeMainCategory === 'Sports' ? 'active' : ''}`}
                    onClick={() => handleMainCategoryChange('Sports')}
                  >
                    Sports
                  </button>
                  <button
                    type="button"
                    className={`explore-filter-dropdown-item ${activeMainCategory === 'Entertainment' ? 'active' : ''}`}
                    onClick={() => handleMainCategoryChange('Entertainment')}
                  >
                    Entertainment
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="explore-filter-row explore-filter-row--chips">
            <div className="explore-filter-chips">
              <button
                type="button"
                className={`explore-filter-chip ${activeSubFilter === null ? 'active' : ''}`}
                onClick={() => setActiveSubFilter(null)}
              >
                All
              </button>
              {subFilterOptions.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`explore-filter-chip ${activeSubFilter === filter ? 'active' : ''}`}
                  onClick={() => setActiveSubFilter(filter)}
                >
                  {subFilterLabel(filter)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FLOATING VERTICAL CONTROL BAR */}
      <div className="vertical-control-pill glass-card animate-scaleIn">
        <button 
          type="button" 
          className="control-pill-btn theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button 
          type="button" 
          className={`control-pill-btn notifications-btn ${isNotificationsOpen ? 'active' : ''}`}
          onClick={() => {
            setIsNotificationsOpen(true);
            setIsSearchOpen(false);
            setIsSettingsOpen(false);
          }}
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="notif-pill-dot"></span>
        </button>
        <button 
          type="button" 
          className={`control-pill-btn search-btn ${isSearchOpen ? 'active' : ''}`}
          onClick={() => {
            setIsSearchOpen(true);
            setIsNotificationsOpen(false);
            setIsSettingsOpen(false);
          }}
          aria-label="Search Events"
        >
          <Search size={18} />
        </button>
        <button 
          type="button" 
          className={`control-pill-btn settings-btn ${isSettingsOpen ? 'active' : ''}`}
          onClick={() => {
            setIsSettingsOpen(true);
            setIsSearchOpen(false);
            setIsNotificationsOpen(false);
          }}
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Floating Apple Zoom controls */}
      <div className="ios-zoom-controls">
        <button type="button" onClick={() => setMapZoom(prev => Math.min(prev + 1, 18))} aria-label="Zoom In">＋</button>
        <button type="button" onClick={() => setMapZoom(prev => Math.max(prev - 1, 3))} aria-label="Zoom Out">－</button>
      </div>

      {/* EXPANDABLE SEARCH MODAL CARD */}
      {isSearchOpen && (
        <>
          <div className="search-panel-backdrop" onClick={() => setIsSearchOpen(false)} />
          <div className="search-panel-container ios-style animate-slideDown">
            <div className="search-panel-header">
              <div className="search-input-box">
                <Search size={16} className="search-box-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search events, venues, locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchSubmit(searchQuery);
                    }
                  }}
                />
                {searchQuery && (
                  <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                    <X size={14} />
                  </button>
                )}
              </div>
              <button 
                type="button" 
                className="close-search-panel-btn" 
                onClick={() => setIsSearchOpen(false)}
                aria-label="Close search"
              >
                <X size={18} />
              </button>
            </div>

            <div className="search-panel-body">
              
              {/* Quick Categories */}
              <div className="search-panel-section">
                <h4>Quick Categories</h4>
                <div className="quick-filters-grid">
                  {quickFilterCategories.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      className="quick-filter-tag"
                      onClick={() => handleQuickFilterClick(filter)}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="search-panel-section">
                  <div className="section-title-row">
                    <h4>Recent Searches</h4>
                    <button className="clear-all-btn" onClick={clearRecentSearches}>Clear All</button>
                  </div>
                  <div className="recent-list">
                    {recentSearches.map((term, index) => (
                      <div 
                        key={index} 
                        className="recent-item" 
                        onClick={() => handleSearchSubmit(term)}
                      >
                        <Clock size={12} className="recent-icon" />
                        <span className="recent-text">{term}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending suggestions */}
              <div className="search-panel-section">
                <h4>Trending Events</h4>
                <div className="trending-list">
                  {events.slice(0, 3).map((event: any) => (
                    <div 
                      key={event.id} 
                      className="trending-item"
                      onClick={() => handleSelectTrendingEvent(event)}
                    >
                      <span className="trending-icon">🔥</span>
                      <div className="trending-details">
                        <span className="trending-name">{event.title}</span>
                        <span className="trending-venue">{event.venue}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </>
      )}

      {/* iOS-STYLE NOTIFICATIONS PANEL */}
      {isNotificationsOpen && (
        <>
          <div className="ios-panel-backdrop" onClick={() => setIsNotificationsOpen(false)} />
          <div className="ios-panel-container glass-card-strong animate-slideInRight">
            <header className="ios-panel-header">
              <h3>Notifications</h3>
              <button type="button" className="ios-panel-close-btn" onClick={() => setIsNotificationsOpen(false)}>
                <X size={16} />
              </button>
            </header>
            <div className="ios-panel-body">
              <div className="ios-notif-card">
                <div className="ios-notif-badge sports">Sports</div>
                <h4>🏏 Cricket Tournament starts tomorrow</h4>
                <p>Matches begin at 09:00 AM at Miyapur Play Ground.</p>
                <span className="ios-notif-time">2h ago</span>
              </div>
              <div className="ios-notif-card">
                <div className="ios-notif-badge entertainment">Music</div>
                <h4>🎵 Music Concert at Hitech City</h4>
                <p>Tickets are selling out fast. Secure yours today.</p>
                <span className="ios-notif-time">5h ago</span>
              </div>
              <div className="ios-notif-card">
                <div className="ios-notif-badge entertainment">Food</div>
                <h4>🍔 Food Festival in Gachibowli</h4>
                <p>Trending food bazaar this weekend. Opens Sunday noon.</p>
                <span className="ios-notif-time">1d ago</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* iOS-STYLE SETTINGS PANEL */}
      {isSettingsOpen && (
        <>
          <div className="ios-panel-backdrop" onClick={() => setIsSettingsOpen(false)} />
          <div className="ios-panel-container glass-card-strong animate-slideInRight">
            <header className="ios-panel-header">
              <h3>Settings</h3>
              <button type="button" className="ios-panel-close-btn" onClick={() => setIsSettingsOpen(false)}>
                <X size={16} />
              </button>
            </header>
            <div className="ios-panel-body">
              <div className="ios-settings-group">
                <h4>Map Toggles</h4>
                <div className="ios-setting-row">
                  <span>Traffic Overlay</span>
                  <label className="ios-switch">
                    <input 
                      type="checkbox" 
                      checked={enableMapTraffic}
                      onChange={(e) => setEnableMapTraffic(e.target.checked)}
                    />
                    <span className="ios-switch-slider"></span>
                  </label>
                </div>
                <div className="ios-setting-row">
                  <span>Satellite View</span>
                  <label className="ios-switch">
                    <input 
                      type="checkbox" 
                      checked={enableMapSatellite}
                      onChange={(e) => setEnableMapSatellite(e.target.checked)}
                    />
                    <span className="ios-switch-slider"></span>
                  </label>
                </div>
                <div className="ios-setting-row">
                  <span>10km Circle Overlay</span>
                  <label className="ios-switch">
                    <input 
                      type="checkbox" 
                      checked={showRadiusBoundary} 
                      onChange={(e) => setShowRadiusBoundary(e.target.checked)} 
                    />
                    <span className="ios-switch-slider"></span>
                  </label>
                </div>
              </div>

              <div className="ios-settings-group">
                <h4>Theme</h4>
                <div className="ios-setting-row">
                  <span>Appearance</span>
                  <button className="ios-settings-action-btn" onClick={toggleTheme} type="button">
                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </button>
                </div>
              </div>

              <div className="ios-settings-group">
                <h4>Account</h4>
                <div className="ios-setting-row">
                  <span>Signed in as</span>
                  <span className="ios-value-text">{localStorage.getItem('zenex-fullname') || 'Zenex Member'}</span>
                </div>
                <button className="ios-settings-secondary-btn" type="button" onClick={() => alert('Manage Account clicked')}>
                  Manage Account
                </button>
              </div>

              <div className="ios-settings-group">
                <h4>Notifications</h4>
                <div className="ios-setting-row">
                  <span>Push Alerts</span>
                  <label className="ios-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="ios-switch-slider"></span>
                  </label>
                </div>
                <div className="ios-setting-row">
                  <span>Email Updates</span>
                  <label className="ios-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="ios-switch-slider"></span>
                  </label>
                </div>
              </div>

              <div className="ios-settings-group">
                <h4>Privacy</h4>
                <div className="ios-setting-row">
                  <span>Location Access</span>
                  <label className="ios-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="ios-switch-slider"></span>
                  </label>
                </div>
                <div className="ios-setting-row">
                  <span>Share Activity</span>
                  <label className="ios-switch">
                    <input type="checkbox" />
                    <span className="ios-switch-slider"></span>
                  </label>
                </div>
              </div>

              <div className="ios-settings-group logout-group">
                <button className="ios-settings-logout-btn" type="button" onClick={() => {
                    setIsSettingsOpen(false);
                    alert('Logout clicked');
                  }}>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default ExplorePage;
