import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Bell, MapPin, Calendar, Clock, Settings, Sun, Moon, X, ChevronDown, Plus, LocateFixed } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { toast } from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import './ExplorePage.css';
import './userLocationMarker.css';
import './eventMapIcons.css';
import { createEventMapIcon, SPORTS_CATEGORIES, ENTERTAINMENT_CATEGORIES } from './eventMapIcons';
import { LocationMapPopup } from './LocationMapPopup';
import { CreateEventModal } from './CreateEventModal';
import { UserLocationMarker } from './UserLocationMarker.tsx';
import { useUserLocation } from './useUserLocation';
import {
  INITIAL_EVENTS,
  loadExploreEvents,
  mergeSeedEvents,
  getEventOrganizer,
  groupEventsByLocation,
  locationKeyFromCoordinates,
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

function LocationMarker({
  coordinates,
  category,
  eventCount,
  isSelected,
  isPopupOpen,
  onSelect,
  children,
}: {
  coordinates: [number, number];
  category: string;
  eventCount: number;
  isSelected: boolean;
  isPopupOpen: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  const markerRef = useRef<L.Marker>(null);
  const icon = useMemo(
    () => createEventMapIcon(category, isSelected, eventCount),
    [category, isSelected, eventCount]
  );

  useEffect(() => {
    if (isSelected) {
      markerRef.current?.openPopup();
    }
  }, [isSelected]);

  const handleMarkerClick = () => {
    if (isPopupOpen) return;
    onSelect();
  };

  return (
    <Marker
      ref={markerRef}
      position={coordinates}
      icon={icon}
      eventHandlers={{ click: handleMarkerClick }}
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

function MapFlyToUser({
  target,
  trigger,
}: {
  target: { lat: number; lng: number } | null;
  trigger: number;
}) {
  const map = useMap();
  // Keep the latest position without making it an effect dependency, so live
  // GPS updates never recenter the map on their own – only an explicit trigger
  // (first fix or a locate-button tap) does.
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (trigger === 0) return;
    const current = targetRef.current;
    if (!current) return;
    map.flyTo([current.lat, current.lng], Math.max(map.getZoom(), 15), {
      animate: true,
      duration: 0.75,
    });
  }, [map, trigger]);

  return null;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({ onViewOrganizerProfile }) => {
  const { theme, toggleTheme } = useTheme();
  const { position: userPosition, heading: userHeading, status: userLocationStatus, requestLocation } =
    useUserLocation();
  const hasCenteredOnUserRef = useRef(false);
  const pendingLocateRef = useRef(false);
  const [flyToUserTrigger, setFlyToUserTrigger] = useState(0);

  // Load events
  const [events, setEvents] = useState<ExploreEvent[]>(() => loadExploreEvents());

  useEffect(() => {
    setEvents((prev) => mergeSeedEvents(prev));
  }, []);

  // Toggles for iOS Floating Panels
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Search filter and query state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMainCategory, setActiveMainCategory] = useState<'Sports' | 'Entertainment'>('Sports');
  const [activeSubFilter, setActiveSubFilter] = useState<string | null>(null);
  const [isMainDropdownOpen, setIsMainDropdownOpen] = useState(false);
  const [isSubFilterExpanded, setIsSubFilterExpanded] = useState(false);
  const filterBarRef = useRef<HTMLDivElement>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('zenex-recent-searches-v3');
    return saved ? JSON.parse(saved) : [];
  });

  // Map viewport panning controller
  const [mapCenter, setMapCenter] = useState<[number, number]>(HYDERABAD_CENTER);
  const [mapZoom, setMapZoom] = useState<number>(11);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [openLocationKey, setOpenLocationKey] = useState<string | null>(null);

  // Settings mock toggles
  const [showRadiusBoundary, setShowRadiusBoundary] = useState(false);
  const [enableMapTraffic, setEnableMapTraffic] = useState(false);
  const [enableMapSatellite, setEnableMapSatellite] = useState(false);

  // Autofocus ref for search
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userPosition) return;

    if (!hasCenteredOnUserRef.current) {
      hasCenteredOnUserRef.current = true;
      setMapCenter([userPosition.lat, userPosition.lng]);
      setMapZoom(15);
      setFlyToUserTrigger(1);
      return;
    }

    if (pendingLocateRef.current) {
      pendingLocateRef.current = false;
      setMapCenter([userPosition.lat, userPosition.lng]);
      setMapZoom((prev) => Math.max(prev, 15));
      setFlyToUserTrigger((n) => n + 1);
    }
  }, [userPosition]);

  const handleLocateMe = () => {
    if (userPosition) {
      setMapCenter([userPosition.lat, userPosition.lng]);
      setMapZoom((prev) => Math.max(prev, 15));
      setFlyToUserTrigger((n) => n + 1);
    } else {
      pendingLocateRef.current = true;
    }
    requestLocation(true);
  };

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
    setOpenLocationKey(locationKeyFromCoordinates(event.coordinates));
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

  const handleCreateEvent = (eventData: Omit<ExploreEvent, 'organizerId'> & { organizerId?: string }) => {
    const startDate = new Date(`${eventData.date}T${eventData.time}`);
    const formattedDate = startDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const newEvent: ExploreEvent = {
      ...eventData,
      title: eventData.title,
      date: formattedDate,
      time: formattedTime,
      organizerId: 'org-me',
    };

    setEvents((prev) => [...prev, newEvent]);
    setMapCenter(newEvent.coordinates);
    setMapZoom(14);
    setOpenLocationKey(locationKeyFromCoordinates(newEvent.coordinates));
    setSelectedEventId(newEvent.id);
    toast.success('Event created!');
  };

  const quickFilterCategories = [...SPORTS_CATEGORIES, ...ENTERTAINMENT_CATEGORIES];

  const subFilterOptions =
    activeMainCategory === 'Sports' ? [...SPORTS_CATEGORIES] : [...ENTERTAINMENT_CATEGORIES];

  // Categories tucked behind the "+ More" chip until expanded.
  const EXTRA_SUB_FILTERS = ['Skateboard', 'Swimming'];
  const extraSubFilters = subFilterOptions.filter((f) => EXTRA_SUB_FILTERS.includes(f));
  const hasMoreSubFilters = extraSubFilters.length > 0;
  const visibleSubFilters =
    isSubFilterExpanded || !hasMoreSubFilters
      ? subFilterOptions
      : subFilterOptions.filter((f) => !EXTRA_SUB_FILTERS.includes(f) || f === activeSubFilter);

  const subFilterLabel = (category: string) => {
    if (category === 'Music') return 'Music / DJ';
    return category;
  };

  const handleMainCategoryChange = (category: 'Sports' | 'Entertainment') => {
    setActiveMainCategory(category);
    setActiveSubFilter(null);
    setIsMainDropdownOpen(false);
    setIsSubFilterExpanded(false);
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

  const locationGroups = useMemo(
    () => groupEventsByLocation(filteredEvents),
    [filteredEvents]
  );

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

          {locationGroups.map((group) => {
            const isLocationOpen = openLocationKey === group.key;
            const hasSelectedEventInGroup = group.events.some((event) => event.id === selectedEventId);
            const isSelected = isLocationOpen || hasSelectedEventInGroup;
            const markerCategory = group.events[0].category;

            return (
              <LocationMarker
                key={group.key}
                coordinates={group.coordinates}
                category={markerCategory}
                eventCount={group.events.length}
                isSelected={isSelected}
                isPopupOpen={isLocationOpen}
                onSelect={() => {
                  setOpenLocationKey(group.key);
                  setSelectedEventId(group.events.length === 1 ? group.events[0].id : null);
                }}
              >
                <Popup
                  closeButton={false}
                  minWidth={260}
                  maxWidth={280}
                  eventHandlers={{
                    remove: () => {
                      if (openLocationKey === group.key) {
                        setOpenLocationKey(null);
                        setSelectedEventId(null);
                      }
                    },
                  }}
                >
                  <LocationMapPopup
                    locationKey={group.key}
                    events={group.events}
                    isOpen={isLocationOpen}
                    focusEventId={
                      selectedEventId &&
                      group.events.some((event) => event.id === selectedEventId)
                        ? selectedEventId
                        : null
                    }
                    onDetailEventChange={setSelectedEventId}
                    onJoin={handleJoinEvent}
                    onLocation={handleOpenLocation}
                    onOrganizerClick={handleOrganizerClick}
                  />
                </Popup>
              </LocationMarker>
            );
          })}

          {userPosition && (
            <UserLocationMarker theme={theme} position={userPosition} heading={userHeading} />
          )}

          <MapFlyToUser target={userPosition} trigger={flyToUserTrigger} />
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
              {visibleSubFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`explore-filter-chip ${activeSubFilter === filter ? 'active' : ''}`}
                  onClick={() => setActiveSubFilter(filter)}
                >
                  {subFilterLabel(filter)}
                </button>
              ))}
              {hasMoreSubFilters && (
                <button
                  type="button"
                  className="explore-filter-chip explore-filter-chip--more"
                  onClick={() => setIsSubFilterExpanded((prev) => !prev)}
                  aria-expanded={isSubFilterExpanded}
                >
                  {isSubFilterExpanded ? 'Less' : '+ More'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FLOATING VERTICAL CONTROL BAR */}
      <div className="vertical-control-pill animate-scaleIn">
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

      {/* Zennex logo + create event (bottom-left), above nav island */}
      <div className="explore-map-bottom-left-stack">
        <div className="explore-map-logo-mark">
          <img src="/logo.png" alt="ZENEX" />
        </div>
        <button
          type="button"
          className="explore-map-create-fab"
          onClick={() => setIsCreateOpen(true)}
          aria-label="Create event"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </div>
      <div className="ios-zoom-controls explore-map-zoom-controls">
        <button type="button" onClick={() => setMapZoom(prev => Math.min(prev + 1, 18))} aria-label="Zoom In">＋</button>
        <button type="button" onClick={() => setMapZoom(prev => Math.max(prev - 1, 3))} aria-label="Zoom Out">－</button>
      </div>
      <button
        type="button"
        className={`explore-map-locate-btn ${userLocationStatus === 'loading' ? 'is-loading' : ''}`}
        onClick={handleLocateMe}
        aria-label="Center map on my location"
        title="Center map on my location"
      >
        <LocateFixed size={20} strokeWidth={2.25} />
      </button>

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

      <CreateEventModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateEvent}
      />

    </div>
  );
};

export default ExplorePage;
