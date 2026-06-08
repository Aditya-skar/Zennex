import React, { useState, useEffect } from 'react';
import { X, MapPin, Calendar, Clock, FileText, Compass } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { SPORTS_CATEGORIES, ENTERTAINMENT_CATEGORIES, createEventMapIcon } from './eventMapIcons';

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function createPinIcon(category: string) {
  return createEventMapIcon(category, true);
}

function MapResizeTrigger() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 250);
  }, [map]);
  return null;
}

interface LocationSelectorProps {
  position: [number, number] | null;
  setPosition: (pos: [number, number]) => void;
  category: string;
}

function LocationSelector({ position, setPosition, category }: LocationSelectorProps) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? <Marker position={position} icon={createPinIcon(category)} /> : null;
}

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventData: any) => void;
}

const SPORTS_CATEGORIES_LIST = [...SPORTS_CATEGORIES];
const ENTERTAINMENT_CATEGORIES_LIST = [...ENTERTAINMENT_CATEGORIES];

export const CreateEventModal: React.FC<CreateEventModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [eventName, setEventName] = useState('');
  const [mainCategory, setMainCategory] = useState<'Sports' | 'Entertainment'>('Sports');
  const [subCategory, setSubCategory] = useState('Cricket');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [position, setPosition] = useState<[number, number] | null>([17.3969, 78.4692]);

  useEffect(() => {
    if (mainCategory === 'Sports') {
      setSubCategory(SPORTS_CATEGORIES_LIST[0]);
    } else {
      setSubCategory(ENTERTAINMENT_CATEGORIES_LIST[0]);
    }
  }, [mainCategory]);

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

    onSubmit({
      id: Date.now().toString(),
      title: eventName,
      category: subCategory,
      mainCategory,
      date,
      time,
      venue,
      location: venue,
      description,
      coordinates: position,
      attendees: 1,
      image,
    });

    setEventName('');
    setMainCategory('Sports');
    setSubCategory('Cricket');
    setDate('');
    setTime('');
    setVenue('');
    setDescription('');
    setPosition([17.3969, 78.4692]);
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

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-form-scroll-container">
            <div className="form-group">
              <label htmlFor="eventName">Event Name *</label>
              <input
                id="eventName"
                type="text"
                placeholder="e.g. Hyderabad Pickleball Open"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Main Category</label>
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
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date">Date *</label>
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
                <label htmlFor="time">Time *</label>
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
              <label htmlFor="venue">Venue / Address *</label>
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

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <div className="input-with-icon align-start">
                <FileText size={16} className="input-icon textarea-icon" />
                <textarea
                  id="description"
                  placeholder="Tell people about your event, rules, entry fees (if any)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Pin Location on Map *</label>
              <p className="field-hint">Click on the map below to set the precise location of the event.</p>
              <div className="modal-mini-map-container">
                <MapContainer
                  center={[17.3969, 78.4692]}
                  zoom={12}
                  style={{ height: '180px', width: '100%', borderRadius: '12px' }}
                  zoomControl={false}
                >
                  <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
                  <LocationSelector position={position} setPosition={setPosition} category={subCategory} />
                  <MapResizeTrigger />
                </MapContainer>
              </div>
              {position && (
                <div className="coordinates-indicator">
                  <span>Lat: {position[0].toFixed(5)}</span>
                  <span>Lng: {position[1].toFixed(5)}</span>
                </div>
              )}
            </div>
          </div>

          <footer className="modal-footer">
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
