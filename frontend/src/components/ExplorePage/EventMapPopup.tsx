import React from 'react';
import { Calendar, Clock, MapPin, Navigation, UserPlus, Users } from 'lucide-react';
import type { ExploreEvent } from './exploreEvents';
import { getEventOrganizer } from './exploreEvents';

type EventMapPopupProps = {
  event: ExploreEvent;
  onJoin: () => void;
  onLocation: () => void;
  onOrganizerClick: () => void;
};

export const EventMapPopup: React.FC<EventMapPopupProps> = ({
  event,
  onJoin,
  onLocation,
  onOrganizerClick,
}) => {
  const organizer = getEventOrganizer(event);

  return (
    <div className="map-popup-card ios-style">
      <span className="map-popup-tag">{event.category}</span>

      <div className="map-popup-head">
        <h4 className="map-popup-title">{event.title}</h4>

        <button type="button" className="map-popup-organizer" onClick={onOrganizerClick}>
          <img src={organizer.avatar} alt={organizer.name} className="map-popup-organizer-avatar" />
          <span className="map-popup-organizer-name">{organizer.name}</span>
          <span className="map-popup-organizer-username">@{organizer.username}</span>
        </button>
      </div>

      <div className="map-popup-details">
        <div className="map-popup-row">
          <Calendar size={12} />
          <span>{event.date}</span>
        </div>
        <div className="map-popup-row">
          <Clock size={12} />
          <span>{event.time}</span>
        </div>
        <div className="map-popup-row">
          <MapPin size={12} />
          <span>{event.venue}</span>
        </div>
        <div className="map-popup-row">
          <Users size={12} />
          <span>{event.attendees} attending</span>
        </div>
      </div>

      {event.description && (
        <p className="map-popup-description">{event.description}</p>
      )}

      <div className="map-popup-actions">
        <button type="button" className="map-popup-btn join-btn" onClick={onJoin}>
          <UserPlus size={13} />
          Join Event
        </button>
        <button type="button" className="map-popup-btn location-btn" onClick={onLocation}>
          <Navigation size={13} />
          Location
        </button>
      </div>
    </div>
  );
};

export default EventMapPopup;
