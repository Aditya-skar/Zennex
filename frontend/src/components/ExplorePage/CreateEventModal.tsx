import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Clock,
  FileText,
  Compass,
  Search,
  Globe,
  UserLock,
  Loader2,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { SPORTS_CATEGORIES, ENTERTAINMENT_CATEGORIES, createEventMapIcon } from './eventMapIcons';
import type { GameAccess } from './exploreEvents';

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const DEFAULT_CENTER: [number, number] = [17.3969, 78.4692];

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

function createPinIcon(category: string) {
  return createEventMapIcon(category, true);
}

function MapResizeTrigger() {
  const map = useMap();
  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 250);
    return () => window.clearTimeout(timer);
  }, [map]);
  return null;
}

function MapFlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, 15, { duration: 0.8 });
    }
  }, [target, map]);
  return null;
}

function LocationSelector({
  position,
  setPosition,
  category,
  onPinDrop,
}: {
  position: [number, number] | null;
  setPosition: (pos: [number, number]) => void;
  category: string;
  onPinDrop?: () => void;
}) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
      onPinDrop?.();
    },
  });

  return position ? <Marker position={position} icon={createPinIcon(category)} /> : null;
}

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventData: Record<string, unknown>) => void;
}

const SPORTS_CATEGORIES_LIST = [...SPORTS_CATEGORIES];
const ENTERTAINMENT_CATEGORIES_LIST = [...ENTERTAINMENT_CATEGORIES];

export const CreateEventModal: React.FC<CreateEventModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [eventName, setEventName] = useState('');
  const [mainCategory, setMainCategory] = useState<'Sports' | 'Entertainment'>('Sports');
  const [subCategory, setSubCategory] = useState('Cricket');
  const [gameAccess, setGameAccess] = useState<GameAccess>('public');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [position, setPosition] = useState<[number, number] | null>(DEFAULT_CENTER);
  const [mapFlyTarget, setMapFlyTarget] = useState<[number, number] | null>(null);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState<NominatimResult[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showLocationResults, setShowLocationResults] = useState(false);

  useEffect(() => {
    if (mainCategory === 'Sports') {
      setSubCategory(SPORTS_CATEGORIES_LIST[0]);
    } else {
      setSubCategory(ENTERTAINMENT_CATEGORIES_LIST[0]);
    }
  }, [mainCategory]);

  const searchLocations = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setLocationResults([]);
      return;
    }

    setIsSearchingLocation(true);
    try {
      const params = new URLSearchParams({
        format: 'json',
        q: trimmed,
        limit: '5',
        countrycodes: 'in',
        viewbox: '78.0,17.0,79.2,17.8',
        bounded: '0',
      });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (!response.ok) throw new Error('Search failed');
      const data = (await response.json()) as NominatimResult[];
      setLocationResults(data);
      setShowLocationResults(true);
    } catch {
      setLocationResults([]);
    } finally {
      setIsSearchingLocation(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const trimmed = locationSearch.trim();
    if (trimmed.length < 3) {
      setLocationResults([]);
      setShowLocationResults(false);
      return;
    }

    const timer = window.setTimeout(() => {
      searchLocations(trimmed);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [locationSearch, isOpen, searchLocations]);

  const handleSelectLocation = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const coords: [number, number] = [lat, lng];
    setPosition(coords);
    setMapFlyTarget(coords);
    setVenue(result.display_name.split(',').slice(0, 2).join(', '));
    setLocationSearch(result.display_name.split(',').slice(0, 2).join(', '));
    setShowLocationResults(false);
    setLocationResults([]);
  };

  const resetForm = () => {
    setEventName('');
    setMainCategory('Sports');
    setSubCategory('Cricket');
    setGameAccess('public');
    setDate('');
    setTime('');
    setVenue('');
    setDescription('');
    setPosition(DEFAULT_CENTER);
    setMapFlyTarget(null);
    setLocationSearch('');
    setLocationResults([]);
    setShowLocationResults(false);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !venue || !date || !time || !position) {
      alert('Please fill out all required fields and select a location on the map.');
      return;
    }

    let image = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80';
    if (subCategory === 'Cricket') image = 'https://images.unsplash.com/photo-1531415080290-bc98545ab3ef?auto=format&fit=crop&w=600&q=80';
    else if (subCategory === 'Music' || subCategory === 'Clubbing') image = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80';
    else if (subCategory === 'Screening') image = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';
    else if (subCategory === 'Cosplaying') image = 'https://images.unsplash.com/photo-1535295972055-1c7624482085?auto=format&fit=crop&w=600&q=80';
    else if (subCategory === 'Basketball') image = 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=600&q=80';
    else if (subCategory === 'Tennis') image = 'https://images.unsplash.com/photo-1622163642999-958948900c39?auto=format&fit=crop&w=600&q=80';
    else if (subCategory === 'Football') image = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80';
    else if (subCategory === 'Badminton') image = 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=600&q=80';
    else if (subCategory === 'Running') image = 'https://images.unsplash.com/photo-1486218119243-13883505764c?auto=format&fit=crop&w=600&q=80';
    else if (subCategory === 'Pickleball') image = 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=600&q=80';
    else if (subCategory === 'Skateboard') image = 'https://images.unsplash.com/photo-1542770665-66a0b85d33f5?auto=format&fit=crop&w=600&q=80';
    else if (subCategory === 'Swimming') image = 'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=600&q=80';

    onSubmit({
      id: Date.now().toString(),
      title: eventName,
      category: subCategory,
      mainCategory,
      gameAccess,
      date,
      time,
      venue,
      location: venue,
      description,
      coordinates: position,
      attendees: 1,
      image,
    });

    resetForm();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content-card ios-bottom-sheet animate-slideUp" onClick={(e) => e.stopPropagation()}>
        <div className="ios-sheet-handle"></div>
        <header className="modal-header">
          <div className="modal-title-group">
            <Compass className="modal-title-icon" size={20} />
            <h3>Create New Event</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="modal-form create-event-form">
          <div className="modal-form-scroll-container">
            <section className="create-event-section">
              <h4 className="create-event-section-title">Event details</h4>
              <div className="form-group">
                <label htmlFor="eventName">Event name</label>
                <input
                  id="eventName"
                  type="text"
                  placeholder="e.g. Hyderabad Pickleball Open"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <div className="category-toggle-group">
                  <button
                    type="button"
                    className={`category-toggle-btn ${mainCategory === 'Sports' ? 'active' : ''}`}
                    onClick={() => setMainCategory('Sports')}
                  >
                    Sports
                  </button>
                  <button
                    type="button"
                    className={`category-toggle-btn ${mainCategory === 'Entertainment' ? 'active' : ''}`}
                    onClick={() => setMainCategory('Entertainment')}
                  >
                    Entertainment
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="subCategory">Subcategory</label>
                <select
                  id="subCategory"
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                >
                  {mainCategory === 'Sports'
                    ? SPORTS_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))
                    : ENTERTAINMENT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                </select>
              </div>
            </section>

            <section className="create-event-section">
              <h4 className="create-event-section-title">Game access</h4>
              <p className="field-hint">Choose who can see and join this event.</p>
              <div className="game-access-toggle">
                <button
                  type="button"
                  className={`game-access-option ${gameAccess === 'public' ? 'active' : ''}`}
                  onClick={() => setGameAccess('public')}
                >
                  <span className="game-access-icon">
                    <Globe size={18} />
                  </span>
                  <span className="game-access-copy">
                    <strong>Public</strong>
                    <span>Anyone on Explore can find and join</span>
                  </span>
                </button>
                <button
                  type="button"
                  className={`game-access-option ${gameAccess === 'invite' ? 'active' : ''}`}
                  onClick={() => setGameAccess('invite')}
                >
                  <span className="game-access-icon invite">
                    <UserLock size={18} />
                  </span>
                  <span className="game-access-copy">
                    <strong>Invite</strong>
                    <span>Only people you invite can join</span>
                  </span>
                </button>
              </div>
            </section>

            <section className="create-event-section">
              <h4 className="create-event-section-title">When & where</h4>
              <div className="form-row form-row--schedule">
                <div className="form-group">
                  <label htmlFor="date">Date</label>
                  <div className="input-with-icon">
                    <Calendar size={16} className="input-icon" />
                    <input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="time">Time</label>
                  <div className="input-with-icon">
                    <Clock size={16} className="input-icon" />
                    <input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="venue">Venue / address</label>
                <div className="input-with-icon">
                  <MapPin size={16} className="input-icon" />
                  <input
                    id="venue"
                    type="text"
                    placeholder="e.g. Gachibowli Stadium Arena, Hyderabad"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    required
                  />
                </div>
              </div>
            </section>

            <section className="create-event-section">
              <h4 className="create-event-section-title">More info</h4>
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <div className="input-with-icon align-start">
                  <FileText size={16} className="input-icon textarea-icon" />
                  <textarea
                    id="description"
                    placeholder="Tell people about your event, rules, entry fees (if any)..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            </section>

            <section className="create-event-section create-event-section--map">
              <h4 className="create-event-section-title">Pin on map</h4>
              <p className="field-hint">Tap the map to set where your event appears on Explore.</p>
              <div className="modal-mini-map-container">
                <MapContainer
                  center={DEFAULT_CENTER}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                >
                  <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
                  <LocationSelector
                    position={position}
                    setPosition={setPosition}
                    category={subCategory}
                    onPinDrop={() => setShowLocationResults(false)}
                  />
                  <MapFlyTo target={mapFlyTarget} />
                  <MapResizeTrigger />
                </MapContainer>
              </div>

              <div className="location-search-block">
                <label htmlFor="locationSearch">Search location</label>
                <div className="location-search-input-wrap">
                  <Search size={16} className="location-search-icon" />
                  <input
                    id="locationSearch"
                    type="search"
                    placeholder="Search venue, area, or address..."
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    onFocus={() => locationResults.length > 0 && setShowLocationResults(true)}
                    autoComplete="off"
                  />
                  {isSearchingLocation && (
                    <Loader2 size={16} className="location-search-spinner" aria-hidden="true" />
                  )}
                </div>

                {showLocationResults && locationResults.length > 0 && (
                  <ul className="location-search-results">
                    {locationResults.map((result) => (
                      <li key={result.place_id}>
                        <button
                          type="button"
                          className="location-search-result"
                          onClick={() => handleSelectLocation(result)}
                        >
                          <MapPin size={14} />
                          <span>{result.display_name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {showLocationResults &&
                  !isSearchingLocation &&
                  locationSearch.trim().length >= 3 &&
                  locationResults.length === 0 && (
                    <p className="location-search-empty">No locations found. Try a different search.</p>
                  )}
              </div>

              {position && (
                <div className="coordinates-indicator">
                  <span>Lat: {position[0].toFixed(5)}</span>
                  <span>Lng: {position[1].toFixed(5)}</span>
                </div>
              )}
            </section>
          </div>

          <footer className="modal-footer create-event-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              Create Event
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default CreateEventModal;
