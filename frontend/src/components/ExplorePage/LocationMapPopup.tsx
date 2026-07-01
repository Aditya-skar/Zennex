import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ExploreEvent } from './exploreEvents';
import { getEventOrganizer } from './exploreEvents';
import { EventMapPopup } from './EventMapPopup';

type LocationMapPopupProps = {
  locationKey: string;
  events: ExploreEvent[];
  isOpen: boolean;
  focusEventId?: string | null;
  onDetailEventChange?: (eventId: string | null) => void;
  onJoin: (event: ExploreEvent) => void;
  onLocation: (event: ExploreEvent) => void;
  onOrganizerClick: (event: ExploreEvent) => void;
  isJoined?: (event: ExploreEvent) => boolean;
};

export const LocationMapPopup: React.FC<LocationMapPopupProps> = ({
  locationKey,
  events,
  isOpen,
  focusEventId,
  onDetailEventChange,
  onJoin,
  onLocation,
  onOrganizerClick,
  isJoined,
}) => {
  const [detailEventId, setDetailEventId] = useState<string | null>(() =>
    events.length === 1 ? events[0].id : null
  );

  useEffect(() => {
    if (!isOpen) return;

    setDetailEventId((current) => {
      if (focusEventId && events.some((event) => event.id === focusEventId)) {
        return focusEventId;
      }
      if (current && events.some((event) => event.id === current)) {
        return current;
      }
      return events.length === 1 ? events[0].id : null;
    });
  }, [isOpen, locationKey, focusEventId, events]);

  const showHostList = events.length > 1 && !detailEventId;
  const activeEvent =
    events.find((event) => event.id === detailEventId) ??
    (events.length === 1 ? events[0] : null);

  const handleSelectEvent = (eventId: string) => {
    setDetailEventId(eventId);
    onDetailEventChange?.(eventId);
  };

  const handleBackToList = () => {
    setDetailEventId(null);
    onDetailEventChange?.(null);
  };

  if (showHostList) {
    const venueLabel = events[0]?.venue ?? 'This location';
    const locationLabel = events[0]?.location;
    const showSeparateLocation =
      locationLabel && locationLabel.trim() !== venueLabel.trim();

    return (
      <div
        className="map-popup-card ios-style map-popup-host-list"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="map-popup-host-list-head">
          <div className="map-popup-host-list-title-block">
            <h4 className="map-popup-title">Choose a host</h4>
            <p className="map-popup-host-list-venue">{venueLabel}</p>
            {showSeparateLocation && (
              <p className="map-popup-host-list-location">{locationLabel}</p>
            )}
          </div>
          <p className="map-popup-host-list-hint">{events.length} at this pin</p>
        </div>

        <ul className="map-popup-host-list">
          {events.map((event) => {
            const organizer = getEventOrganizer(event);

            return (
              <li key={event.id}>
                <button
                  type="button"
                  className="map-popup-host-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectEvent(event.id);
                  }}
                >
                  <img
                    src={organizer.avatar}
                    alt={organizer.name}
                    className="map-popup-host-item-avatar"
                  />
                  <span className="map-popup-host-item-copy">
                    <strong>{organizer.name}</strong>
                    <span>{event.title}</span>
                    <span className="map-popup-host-item-meta">
                      {event.category} · {event.date}
                    </span>
                  </span>
                  <ChevronRight size={16} className="map-popup-host-item-chevron" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (!activeEvent) return null;

  return (
    <div
      className="map-popup-detail-wrap"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {events.length > 1 && (
        <button type="button" className="map-popup-back-btn" onClick={handleBackToList}>
          <ChevronLeft size={16} />
          All hosts
        </button>
      )}
      <EventMapPopup
        event={activeEvent}
        joined={isJoined?.(activeEvent) ?? false}
        onJoin={() => onJoin(activeEvent)}
        onLocation={() => onLocation(activeEvent)}
        onOrganizerClick={() => onOrganizerClick(activeEvent)}
      />
    </div>
  );
};

export default LocationMapPopup;
