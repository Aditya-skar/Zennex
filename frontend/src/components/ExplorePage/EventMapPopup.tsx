import React from 'react';
import { Calendar, Clock, MapPin, Navigation, UserPlus, Users, Globe, UserLock, Check } from 'lucide-react';
import type { ExploreEvent } from './exploreEvents';
import { getEventOrganizer } from './exploreEvents';

type EventMapPopupProps = {
  event: ExploreEvent;
  joined?: boolean;
  onJoin: () => void;
  onLocation: () => void;
  onOrganizerClick: () => void;
};

export const EventMapPopup: React.FC<EventMapPopupProps> = ({
  event,
  joined = false,
  onJoin,
  onLocation,
  onOrganizerClick,
}) => {
  const organizer = getEventOrganizer(event);
  const isInviteOnly = event.gameAccess === 'invite';

  return (
    <div className="map-popup-card ios-style">
      <div className="map-popup-tags">
        <span className="map-popup-tag">{event.category}</span>
        <span className={`map-popup-tag access-tag ${isInviteOnly ? 'invite' : 'public'}`}>
          {isInviteOnly ? (
            <>
              <UserLock size={10} />
              Invite
            </>
          ) : (
            <>
              <Globe size={10} />
              Public
            </>
          )}
        </span>
      </div>

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
        <button
          type="button"
          className={`map-popup-btn join-btn ${joined ? 'is-joined' : ''}`}
          onClick={onJoin}
        >
          {joined ? <Check size={13} /> : <UserPlus size={13} />}
          {joined ? 'Joined' : 'Join Event'}
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
