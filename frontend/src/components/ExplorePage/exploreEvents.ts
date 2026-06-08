export type EventOrganizer = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  role: string;
  bio: string;
  location: string;
  eventsHosted: number;
};

export type ExploreEvent = {
  id: string;
  title: string;
  category: string;
  mainCategory: 'Sports' | 'Entertainment';
  date: string;
  time: string;
  venue: string;
  location: string;
  description: string;
  coordinates: [number, number];
  attendees: number;
  image: string;
  organizerId: string;
};

export const EVENT_ORGANIZERS: EventOrganizer[] = [
  {
    id: 'org-rahul',
    name: 'Rahul Sharma',
    username: 'rahul_cricket',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&h=150&q=80',
    role: 'Cricket Organizer',
    bio: 'Hosts weekend cricket leagues and community knockout tournaments across Hyderabad.',
    location: 'Miyapur, Hyderabad',
    eventsHosted: 18,
  },
  {
    id: 'org-priya',
    name: 'Priya Reddy',
    username: 'priya_hoops',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
    role: 'Basketball Host',
    bio: 'Runs 3v3 street basketball nights and youth training sessions in Gachibowli.',
    location: 'Gachibowli, Hyderabad',
    eventsHosted: 12,
  },
  {
    id: 'org-arjun',
    name: 'Arjun Mehta',
    username: 'arjun_football',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
    role: 'Football Captain',
    bio: 'Organises Sunday football matches and turf bookings for casual squads.',
    location: 'Madhapur, Hyderabad',
    eventsHosted: 24,
  },
  {
    id: 'org-sneha',
    name: 'Sneha Kapoor',
    username: 'sneha_pickle',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80',
    role: 'Racket Sports Host',
    bio: 'Pickleball, tennis and badminton socials for all skill levels.',
    location: 'Kondapur, Hyderabad',
    eventsHosted: 15,
  },
  {
    id: 'org-vikram',
    name: 'Vikram Das',
    username: 'vikram_runs',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
    role: 'Run Club Lead',
    bio: 'Sunrise runs, trail groups and 5K/10K community challenges.',
    location: 'Hitech City, Hyderabad',
    eventsHosted: 31,
  },
  {
    id: 'org-dj-kiran',
    name: 'DJ Kiran',
    username: 'dj_kiran',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&h=150&q=80',
    role: 'Music & Nightlife',
    bio: 'Curates rooftop DJ sets, live music nights and festival pop-ups.',
    location: 'Jubilee Hills, Hyderabad',
    eventsHosted: 22,
  },
  {
    id: 'org-ananya',
    name: 'Ananya Iyer',
    username: 'ananya_events',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80',
    role: 'Culture Curator',
    bio: 'Screenings, cosplay meetups and arts community gatherings.',
    location: 'Banjara Hills, Hyderabad',
    eventsHosted: 19,
  },
];

export const ORGANIZER_BY_ID = Object.fromEntries(
  EVENT_ORGANIZERS.map((organizer) => [organizer.id, organizer])
) as Record<string, EventOrganizer>;

export const INITIAL_EVENTS: ExploreEvent[] = [
  {
    id: 'evt-cricket',
    title: 'Cricket Tournament',
    category: 'Cricket',
    mainCategory: 'Sports',
    date: 'Sun, June 14',
    time: '09:00 AM',
    venue: 'Miyapur Play Ground, Miyapur',
    location: 'Miyapur Play Ground, Miyapur',
    description: 'Join the premier amateur cricket league tournament in Hyderabad.',
    coordinates: [17.4968, 78.3614],
    attendees: 56,
    image: 'https://images.unsplash.com/photo-1531415080290-bc98545ab3ef?auto=format&fit=crop&w=600&q=80',
    organizerId: 'org-rahul',
  },
  {
    id: 'evt-basketball',
    title: '3v3 Basketball League',
    category: 'Basketball',
    mainCategory: 'Sports',
    date: 'Sat, June 13',
    time: '06:00 PM',
    venue: 'Gachibowli Indoor Arena',
    location: 'Gachibowli Indoor Arena',
    description: 'Fast-paced street basketball tournament. Teams of 3, register now!',
    coordinates: [17.4401, 78.3489],
    attendees: 24,
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=600&q=80',
    organizerId: 'org-priya',
  },
  {
    id: 'evt-football',
    title: 'Sunday Football Match',
    category: 'Football',
    mainCategory: 'Sports',
    date: 'Sun, June 7',
    time: '05:00 PM',
    venue: 'Madhapur Turf, Hyderabad',
    location: 'Madhapur Turf, Hyderabad',
    description: 'Casual 11-a-side football. All skill levels welcome.',
    coordinates: [17.4485, 78.3912],
    attendees: 18,
    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80',
    organizerId: 'org-arjun',
  },
  {
    id: 'evt-pickleball',
    title: 'Pickleball Social',
    category: 'Pickleball',
    mainCategory: 'Sports',
    date: 'Fri, June 12',
    time: '07:00 AM',
    venue: 'Kondapur Sports Complex',
    location: 'Kondapur Sports Complex',
    description: 'Morning pickleball doubles. Paddles available on rent.',
    coordinates: [17.4622, 78.3578],
    attendees: 12,
    image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=600&q=80',
    organizerId: 'org-sneha',
  },
  {
    id: 'evt-tennis',
    title: 'Tennis Open Doubles',
    category: 'Tennis',
    mainCategory: 'Sports',
    date: 'Wed, June 18',
    time: '04:00 PM',
    venue: 'Banjara Hills Tennis Club',
    location: 'Banjara Hills Tennis Club',
    description: 'Mixed doubles round-robin. Intermediate level and above.',
    coordinates: [17.4156, 78.4347],
    attendees: 16,
    image: 'https://images.unsplash.com/photo-1622163642999-958948900c39?auto=format&fit=crop&w=600&q=80',
    organizerId: 'org-sneha',
  },
  {
    id: 'evt-badminton',
    title: 'Badminton Smash Night',
    category: 'Badminton',
    mainCategory: 'Sports',
    date: 'Thu, June 19',
    time: '08:00 PM',
    venue: 'Hitech City Sports Hub',
    location: 'Hitech City Sports Hub',
    description: 'Late-night badminton sessions with timed match rotations.',
    coordinates: [17.4435, 78.3772],
    attendees: 20,
    image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=600&q=80',
    organizerId: 'org-sneha',
  },
  {
    id: 'evt-running',
    title: 'Sunrise Run Club',
    category: 'Running',
    mainCategory: 'Sports',
    date: 'Sat, June 21',
    time: '06:00 AM',
    venue: 'Durgam Cheruvu Lake Trail',
    location: 'Durgam Cheruvu Lake Trail',
    description: '5K and 10K group run along the lake. Hydration stops included.',
    coordinates: [17.4312, 78.4065],
    attendees: 45,
    image: 'https://images.unsplash.com/photo-1486218119243-13883505764c?auto=format&fit=crop&w=600&q=80',
    organizerId: 'org-vikram',
  },
  {
    id: 'evt-music',
    title: 'Sunset DJ Session',
    category: 'Music',
    mainCategory: 'Entertainment',
    date: 'Sat, June 20',
    time: '06:00 PM',
    venue: 'Over the Moon, Gachibowli',
    location: 'Over the Moon, Gachibowli',
    description: 'Live DJ sets with house and techno. Rooftop vibes.',
    coordinates: [17.4358, 78.3634],
    attendees: 350,
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
    organizerId: 'org-dj-kiran',
  },
  {
    id: 'evt-screening',
    title: 'Open-Air Movie Screening',
    category: 'Screening',
    mainCategory: 'Entertainment',
    date: 'Fri, June 26',
    time: '07:30 PM',
    venue: 'Shilparamam Amphitheatre',
    location: 'Shilparamam Amphitheatre',
    description: 'Classic film night under the stars. Bring your own blanket.',
    coordinates: [17.4698, 78.3775],
    attendees: 120,
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
    organizerId: 'org-ananya',
  },
  {
    id: 'evt-clubbing',
    title: 'Neon Nights Club',
    category: 'Clubbing',
    mainCategory: 'Entertainment',
    date: 'Sat, June 27',
    time: '10:00 PM',
    venue: 'Brew Buzz, Jubilee Hills',
    location: 'Brew Buzz, Jubilee Hills',
    description: 'Saturday club night with guest DJs and laser show.',
    coordinates: [17.4265, 78.4198],
    attendees: 280,
    image: 'https://images.unsplash.com/photo-1571266028247-e4733b0f0bb0?auto=format&fit=crop&w=600&q=80',
    organizerId: 'org-dj-kiran',
  },
  {
    id: 'evt-cosplaying',
    title: 'Anime Cosplay Meetup',
    category: 'Cosplaying',
    mainCategory: 'Entertainment',
    date: 'Sun, June 28',
    time: '11:00 AM',
    venue: 'Forum Sujana Mall, KPHB',
    location: 'Forum Sujana Mall, KPHB',
    description: 'Cosplay parade, photo booths, and character meet-ups.',
    coordinates: [17.4942, 78.3996],
    attendees: 95,
    image: 'https://images.unsplash.com/photo-1535295972055-1c7624482085?auto=format&fit=crop&w=600&q=80',
    organizerId: 'org-ananya',
  },
];

const INITIAL_EVENT_BY_ID = Object.fromEntries(
  INITIAL_EVENTS.map((event) => [event.id, event])
) as Record<string, ExploreEvent>;

export function normalizeExploreEvent(
  event: Partial<ExploreEvent> & Pick<ExploreEvent, 'id'>
): ExploreEvent {
  const fallback = INITIAL_EVENT_BY_ID[event.id];

  return {
    ...(fallback ?? INITIAL_EVENTS[0]),
    ...event,
    coordinates: (event.coordinates ?? fallback?.coordinates ?? INITIAL_EVENTS[0].coordinates) as [
      number,
      number,
    ],
    organizerId: event.organizerId ?? fallback?.organizerId ?? 'org-rahul',
  };
}

export function loadExploreEvents(): ExploreEvent[] {
  const saved = localStorage.getItem('zenex-explore-events-v4');
  if (!saved) return INITIAL_EVENTS;

  try {
    const parsed = JSON.parse(saved) as Array<Partial<ExploreEvent> & Pick<ExploreEvent, 'id'>>;
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_EVENTS;
    return parsed.map(normalizeExploreEvent);
  } catch {
    return INITIAL_EVENTS;
  }
}

export function getEventOrganizer(event: Partial<ExploreEvent>): EventOrganizer {
  const organizerId =
    event.organizerId ??
    (event.id ? INITIAL_EVENT_BY_ID[event.id]?.organizerId : undefined) ??
    'org-rahul';

  return ORGANIZER_BY_ID[organizerId] ?? EVENT_ORGANIZERS[0];
}

export function openEventInGoogleMaps(event: ExploreEvent): void {
  const [lat, lng] = event.coordinates;
  window.open(
    `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    '_blank',
    'noopener,noreferrer'
  );
}
