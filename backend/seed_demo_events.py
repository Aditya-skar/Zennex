"""Seed the demo events (and, since Phase 3, their backing posts) that the
frontend used to hold only in local state.

Explore reads from the API once VITE_API_URL is set, so anything that isn't in
this database has no pin — which is why the Home feed could show events the
map didn't. These rows mirror INITIAL_EVENTS in
frontend/src/components/ExplorePage/exploreEvents.ts: same event ids, so a Home
post's "View location" resolves, and same mock organizer ids ('org-rahul',
...), which the frontend already knows how to render without a user lookup.

DEMO_POSTS mirrors SEED_HOME_FEED_POSTS in
frontend/src/components/HomeFeed/homeFeed.ts (same post ids, authors,
captions, reshare relationships) so live-mode Home shows the same demo feed as
mock mode — except post-level fields only (title/category/coordinates/etc are
hydrated server-side from the linked event via a join, per PostDto, so they
can never drift from it — which also fixes the one pre-existing mismatch in
the mock data, where "post-dj-live" hardcoded a different event title than
`evt-clubbing` actually has).

Dates are generated relative to the day you run this, so the demo never drifts
into showing only past events. Re-running replaces the demo rows (both events
and posts) and leaves user-created events/posts untouched.

    python seed_demo_events.py
"""
import asyncio
import uuid
from datetime import date, datetime, time as dt_time, timedelta, timezone

from sqlalchemy import delete, select

from app.database import AsyncSessionLocal, init_models
from app.models import Event, Post, PostLike, User
from app.security import hash_password

# Backing User rows for the demo/mock organizer ids referenced by DEMO_EVENTS
# and DEMO_POSTS (org-rahul, org-priya, ...) — mirrors EVENT_ORGANIZERS in
# frontend/src/components/ExplorePage/exploreEvents.ts. Without a real User
# row, POST /api/follows/{id} 404s for every demo author, since the follow
# graph (unlike the event/post display data) always resolves against the
# real users table. These are NPC accounts: nobody can log into them (the
# password hash is random and never shared), they just need to exist so
# following/likes/affinity referencing them work like any other user.
DEMO_ORGANIZERS: list[dict] = [
    {
        "id": "org-rahul",
        "username": "rahul_cricket",
        "full_name": "Rahul Sharma",
        "avatar_url": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&h=150&q=80",
        "bio": "Hosts weekend cricket leagues and community knockout tournaments across Hyderabad.",
        "location": "Miyapur, Hyderabad",
    },
    {
        "id": "org-priya",
        "username": "priya_hoops",
        "full_name": "Priya Reddy",
        "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
        "bio": "Runs 3v3 street basketball nights and youth training sessions in Gachibowli.",
        "location": "Gachibowli, Hyderabad",
    },
    {
        "id": "org-arjun",
        "username": "arjun_football",
        "full_name": "Arjun Mehta",
        "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
        "bio": "Organises Sunday football matches and turf bookings for casual squads.",
        "location": "Madhapur, Hyderabad",
    },
    {
        "id": "org-sneha",
        "username": "sneha_pickle",
        "full_name": "Sneha Kapoor",
        "avatar_url": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80",
        "bio": "Pickleball, tennis and badminton socials for all skill levels.",
        "location": "Kondapur, Hyderabad",
    },
    {
        "id": "org-vikram",
        "username": "vikram_runs",
        "full_name": "Vikram Das",
        "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80",
        "bio": "Sunrise runs, trail groups and 5K/10K community challenges.",
        "location": "Hitech City, Hyderabad",
    },
    {
        "id": "org-dj-kiran",
        "username": "dj_kiran",
        "full_name": "DJ Kiran",
        "avatar_url": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&h=150&q=80",
        "bio": "Curates rooftop DJ sets, live music nights and festival pop-ups.",
        "location": "Jubilee Hills, Hyderabad",
    },
    {
        "id": "org-ananya",
        "username": "ananya_events",
        "full_name": "Ananya Iyer",
        "avatar_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80",
        "bio": "Screenings, cosplay meetups and arts community gatherings.",
        "location": "Banjara Hills, Hyderabad",
    },
]

# (days_from_now, 24h time) drive the display strings; the offsets preserve the
# original demo's spread so the map shows a believable mix of soon and later.
DEMO_EVENTS: list[dict] = [
    {
        "id": "evt-football",
        "days": 2,
        "at": "17:00",
        "title": "Sunday Football Match",
        "category": "Football",
        "main_category": "Sports",
        "venue": "Madhapur Turf, Hyderabad",
        "description": "Casual 11-a-side football. All skill levels welcome.",
        "lat": 17.4485,
        "lng": 78.3912,
        "attendees": 18,
        "organizer_id": "org-arjun",
        "image": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80",
    },
    {
        "id": "evt-pickleball",
        "days": 7,
        "at": "07:00",
        "title": "Pickleball Social",
        "category": "Pickleball",
        "main_category": "Sports",
        "venue": "Kondapur Sports Complex",
        "description": "Morning pickleball doubles. Paddles available on rent.",
        "lat": 17.4622,
        "lng": 78.3578,
        "attendees": 12,
        "organizer_id": "org-sneha",
        "image": "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=600&q=80",
    },
    {
        "id": "evt-futsal",
        "days": 7,
        "at": "20:00",
        "title": "Friday Futsal Pickup",
        "category": "Football",
        "main_category": "Sports",
        "venue": "Madhapur Turf, Hyderabad",
        "description": "Small-sided futsal under the lights. Bring indoor shoes.",
        "lat": 17.4485,
        "lng": 78.3912,
        "attendees": 10,
        "organizer_id": "org-vikram",
        "image": "https://images.unsplash.com/photo-1574629810360-7abca99b5a64?auto=format&fit=crop&w=600&q=80",
    },
    {
        "id": "evt-basketball",
        "days": 8,
        "at": "18:00",
        "title": "3v3 Basketball League",
        "category": "Basketball",
        "main_category": "Sports",
        "venue": "Gachibowli Indoor Arena",
        "description": "Fast-paced street basketball tournament. Teams of 3, register now!",
        "lat": 17.4401,
        "lng": 78.3489,
        "attendees": 24,
        "organizer_id": "org-priya",
        "image": "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=600&q=80",
    },
    {
        "id": "evt-cricket",
        "days": 9,
        "at": "09:00",
        "title": "Cricket Tournament",
        "category": "Cricket",
        "main_category": "Sports",
        "venue": "Miyapur Play Ground, Miyapur",
        "description": "Join the premier amateur cricket league tournament in Hyderabad.",
        "lat": 17.4968,
        "lng": 78.3614,
        "attendees": 56,
        "organizer_id": "org-rahul",
        "image": "https://images.unsplash.com/photo-1531415080290-bc98545ab3ef?auto=format&fit=crop&w=600&q=80",
    },
    {
        "id": "evt-tennis",
        "days": 13,
        "at": "16:00",
        "title": "Tennis Open Doubles",
        "category": "Tennis",
        "main_category": "Sports",
        "venue": "Banjara Hills Tennis Club",
        "description": "Mixed doubles round-robin. Intermediate level and above.",
        "lat": 17.4156,
        "lng": 78.4347,
        "attendees": 16,
        "organizer_id": "org-sneha",
        "image": "https://images.unsplash.com/photo-1622163642999-958948900c39?auto=format&fit=crop&w=600&q=80",
    },
    {
        "id": "evt-badminton",
        "days": 14,
        "at": "20:00",
        "title": "Badminton Smash Night",
        "category": "Badminton",
        "main_category": "Sports",
        "venue": "Hitech City Sports Hub",
        "description": "Late-night badminton sessions with timed match rotations.",
        "lat": 17.4435,
        "lng": 78.3772,
        "attendees": 20,
        "organizer_id": "org-sneha",
        "image": "https://images.unsplash.com/photo-1620595435019-9d5d14e54fe0?auto=format&fit=crop&w=600&q=80",
    },
    {
        "id": "evt-music",
        "days": 15,
        "at": "18:00",
        "title": "Sunset DJ Session",
        "category": "Music",
        "main_category": "Entertainment",
        "venue": "Over the Moon, Gachibowli",
        "description": "Live DJ sets with house and techno. Rooftop vibes.",
        "lat": 17.4358,
        "lng": 78.3634,
        "attendees": 350,
        "organizer_id": "org-dj-kiran",
        "image": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
    },
    {
        "id": "evt-running",
        "days": 16,
        "at": "06:00",
        "title": "Sunrise Run Club",
        "category": "Running",
        "main_category": "Sports",
        "venue": "Durgam Cheruvu Lake Trail",
        "description": "5K and 10K group run along the lake. Hydration stops included.",
        "lat": 17.4312,
        "lng": 78.4065,
        "attendees": 45,
        "organizer_id": "org-vikram",
        "image": "https://images.unsplash.com/photo-1486218119243-13883505764c?auto=format&fit=crop&w=600&q=80",
    },
    {
        "id": "evt-skateboard",
        "days": 17,
        "at": "17:00",
        "title": "Skate Park Session",
        "category": "Skateboard",
        "main_category": "Sports",
        "venue": "Shilparamam Skate Plaza",
        "description": "Open skate session for all levels. Helmets recommended.",
        "lat": 17.4050,
        "lng": 78.4550,
        "attendees": 14,
        "organizer_id": "org-vikram",
        "image": "https://images.unsplash.com/photo-1542770665-66a0b85d33f5?auto=format&fit=crop&w=600&q=80",
    },
    {
        "id": "evt-swimming",
        "days": 18,
        "at": "07:00",
        "title": "Morning Lap Swim",
        "category": "Swimming",
        "main_category": "Sports",
        "venue": "Gachibowli Aquatic Center",
        "description": "Lane swimming and technique drills. All strokes welcome.",
        "lat": 17.3880,
        "lng": 78.4820,
        "attendees": 22,
        "organizer_id": "org-priya",
        "image": "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=600&q=80",
    },
    {
        "id": "evt-screening",
        "days": 21,
        "at": "19:30",
        "title": "Open-Air Movie Screening",
        "category": "Screening",
        "main_category": "Entertainment",
        "venue": "Shilparamam Amphitheatre",
        "description": "Classic film night under the stars. Bring your own blanket.",
        "lat": 17.4698,
        "lng": 78.3775,
        "attendees": 120,
        "organizer_id": "org-ananya",
        "image": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80",
    },
    {
        "id": "evt-clubbing",
        "days": 22,
        "at": "22:00",
        "title": "Neon Nights Club",
        "category": "Clubbing",
        "main_category": "Entertainment",
        "venue": "Brew Buzz, Jubilee Hills",
        "description": "Saturday club night with guest DJs and laser show.",
        "lat": 17.4265,
        "lng": 78.4198,
        "attendees": 280,
        "organizer_id": "org-dj-kiran",
        "image": "https://images.unsplash.com/photo-1571266028247-e4733b0f0bb0?auto=format&fit=crop&w=600&q=80",
    },
    {
        "id": "evt-cosplaying",
        "days": 23,
        "at": "11:00",
        "title": "Anime Cosplay Meetup",
        "category": "Cosplaying",
        "main_category": "Entertainment",
        "venue": "Forum Sujana Mall, KPHB",
        "description": "Cosplay parade, photo booths, and character meet-ups.",
        "lat": 17.4942,
        "lng": 78.3996,
        "attendees": 95,
        "organizer_id": "org-ananya",
        "image": "https://images.unsplash.com/photo-1535295972055-1c7624482085?auto=format&fit=crop&w=600&q=80",
    },
    {
        "id": "evt-yoga",
        "days": 33,
        "at": "18:30",
        "title": "Sunset Yoga Flow",
        "category": "Yoga",
        "main_category": "Sports",
        "venue": "KBR National Park Lawn",
        "location": "KBR National Park, Jubilee Hills",
        "description": "Open-air vinyasa flow as the sun sets. Mats provided, all levels welcome.",
        "lat": 17.4122,
        "lng": 78.4070,
        "attendees": 38,
        "organizer_id": "org-priya",
        "image": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80",
    },
    {
        "id": "evt-volleyball",
        "days": 37,
        "at": "17:00",
        "title": "Sand Volleyball League",
        "category": "Volleyball",
        "main_category": "Sports",
        "venue": "Necklace Road Sports Arena",
        "location": "Necklace Road, Hyderabad",
        "description": "4v4 beach volleyball under the floodlights. Teams register on arrival.",
        "lat": 17.4401,
        "lng": 78.4650,
        "attendees": 28,
        "organizer_id": "org-rahul",
        "image": "https://images.unsplash.com/photo-1612872085224-b08a92e221f6?auto=format&fit=crop&w=600&q=80",
    },
    {
        "id": "evt-hiking",
        "days": 38,
        "at": "05:30",
        "title": "Gandipet Hill Trek",
        "category": "Hiking",
        "main_category": "Sports",
        "venue": "Gandipet Lake Trailhead",
        "location": "Gandipet, Hyderabad",
        "description": "Moderate sunrise trek with lake views. Carry 1L water minimum.",
        "lat": 17.3885,
        "lng": 78.3012,
        "attendees": 34,
        "organizer_id": "org-vikram",
        "image": "https://images.unsplash.com/photo-1551632811-561732b04104?auto=format&fit=crop&w=600&q=80",
    },
    {
        "id": "evt-pilates",
        "days": 40,
        "at": "07:30",
        "title": "Reformer Pilates Class",
        "category": "Pilates",
        "main_category": "Sports",
        "venue": "Core Studio, Jubilee Hills",
        "location": "Jubilee Hills, Hyderabad",
        "description": "Reformer-based Pilates focused on core strength and posture. All levels.",
        "lat": 17.4265,
        "lng": 78.4198,
        "attendees": 15,
        "organizer_id": "org-priya",
        "image": "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80",
    },
    {
        "id": "evt-crossfit",
        "days": 41,
        "at": "06:00",
        "title": "CrossFit Community WOD",
        "category": "CrossFit",
        "main_category": "Sports",
        "venue": "Financial District Gym",
        "location": "Nanakramguda, Hyderabad",
        "description": "Partner workout of the day. Scaled options for every fitness level.",
        "lat": 17.4196,
        "lng": 78.3403,
        "attendees": 26,
        "organizer_id": "org-priya",
        "image": "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=600&q=80",
    },
    {
        "id": "evt-liveband",
        "days": 42,
        "at": "20:30",
        "title": "Indie Live Band Night",
        "category": "Music",
        "main_category": "Entertainment",
        "venue": "The Park, Somajiguda",
        "location": "Somajiguda, Hyderabad",
        "description": "Three local indie acts back-to-back. Early bird entry before 8.",
        "lat": 17.4234,
        "lng": 78.4578,
        "attendees": 110,
        "organizer_id": "org-dj-kiran",
        "image": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80",
    },
    {
        "id": "evt-calisthenics",
        "days": 45,
        "at": "07:00",
        "title": "Calisthenics Park Workout",
        "category": "Calisthenics",
        "main_category": "Sports",
        "venue": "KBR Park Outdoor Bars",
        "location": "Jubilee Hills, Hyderabad",
        "description": "Bodyweight training on bars and rings — pull-ups, dips, muscle-ups. All levels.",
        "lat": 17.4122,
        "lng": 78.4070,
        "attendees": 19,
        "organizer_id": "org-vikram",
        "image": "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&w=600&q=80",
    },
    {
        "id": "evt-weightlifting",
        "days": 49,
        "at": "06:30",
        "title": "Olympic Weightlifting Clinic",
        "category": "Weightlifting",
        "main_category": "Sports",
        "venue": "Iron Temple Gym, Kondapur",
        "location": "Kondapur, Hyderabad",
        "description": "Coached snatch and clean & jerk technique session. Chalk provided.",
        "lat": 17.4622,
        "lng": 78.3578,
        "attendees": 12,
        "organizer_id": "org-arjun",
        "image": "https://images.unsplash.com/photo-1534368959876-26bf04f2c947?auto=format&fit=crop&w=600&q=80",
    },
    {
        "id": "evt-bodybuilding",
        "days": 51,
        "at": "17:00",
        "title": "Bodybuilding Pump Session",
        "category": "Bodybuilding",
        "main_category": "Sports",
        "venue": "Muscle Factory, Madhapur",
        "location": "Madhapur, Hyderabad",
        "description": "Hypertrophy-focused group lift — chest & back day. Spotters on hand.",
        "lat": 17.4485,
        "lng": 78.3912,
        "attendees": 20,
        "organizer_id": "org-arjun",
        "image": "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=600&q=80",
    },
]

# Mirrors SEED_HOME_FEED_POSTS in frontend/src/components/HomeFeed/homeFeed.ts.
# `event_id` must exist in DEMO_EVENTS above. Event-derived display fields
# (title, category, coordinates, ...) are intentionally NOT repeated here —
# PostDto hydrates them from the joined event, see routers/posts.py::_to_dto.
DEMO_POSTS: list[dict] = [
    {
        "id": "post-cricket-poster",
        "event_id": "evt-cricket",
        "author_id": "org-rahul",
        "type": "poster",
        "caption": "Slots filling fast for the Sunday Premier Cricket Tournament. Register your squad now!",
        "image_url": "https://images.unsplash.com/photo-1531415080290-bc98545ab3ef?auto=format&fit=crop&w=800&q=80",
        "registration_type": "limited",
        "slots_total": 16,
        "slots_filled": 12,
    },
    {
        "id": "post-music-reshare",
        "event_id": "evt-music",
        "author_id": "org-ananya",
        "type": "poster",
        "caption": "Resharing this rooftop sundowner — my favourite DJ night in the city. See you all there!",
        "image_url": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80",
        "is_reshared": True,
        "original_host_id": "org-dj-kiran",
    },
    {
        "id": "post-run-text",
        "event_id": "evt-running",
        "author_id": "org-vikram",
        "type": "text",
        "caption": "Private run this Saturday for the core crew \U0001f3c3 — 10K along the lake trail, hydration stops sorted. Ping me if you want in.",
        "visibility": "private",
    },
    {
        "id": "post-dj-live",
        "event_id": "evt-clubbing",
        "author_id": "org-dj-kiran",
        "type": "poster",
        "caption": "New set dropping this weekend \U0001f3a7 House, techno and a surprise live act. Limited entry!",
        "image_url": "https://images.unsplash.com/photo-1571266028247-e4733b0f0bb0?auto=format&fit=crop&w=800&q=80",
        "registration_type": "limited",
        "slots_total": 80,
        "slots_filled": 62,
    },
    {
        "id": "post-basketball-reshare-text",
        "event_id": "evt-basketball",
        "author_id": "org-arjun",
        "type": "text",
        "caption": "Resharing Priya's 3v3 league — one of the best-run street tournaments around. Highly recommend signing up.",
        "is_reshared": True,
        "original_host_id": "org-priya",
        "registration_type": "limited",
        "slots_total": 24,
        "slots_filled": 19,
    },
    {
        "id": "post-pickleball",
        "event_id": "evt-pickleball",
        "author_id": "org-sneha",
        "type": "poster",
        "caption": "Morning pickleball doubles this Friday \U0001f3d3 Paddles on rent, all levels welcome!",
        "image_url": "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80",
        "registration_type": "limited",
        "slots_total": 12,
        "slots_filled": 9,
    },
    {
        "id": "post-football-upcoming",
        "event_id": "evt-football",
        "author_id": "org-arjun",
        "type": "text",
        "caption": "Sunday 11-a-side is on \u26bd Two spots left, first come first served. Turf booked till 7.",
        "registration_type": "limited",
        "slots_total": 22,
        "slots_filled": 20,
    },
    {
        "id": "post-tennis-past",
        "event_id": "evt-tennis",
        "author_id": "org-sneha",
        "type": "poster",
        "caption": "What a turnout at the Open Doubles! Thanks to everyone who came out. Next edition soon \U0001f3be",
        "image_url": "https://images.unsplash.com/photo-1622163642999-958948900c39?auto=format&fit=crop&w=800&q=80",
    },
    {
        "id": "post-football-past-reshare",
        "event_id": "evt-football",
        "author_id": "org-vikram",
        "type": "poster",
        "caption": "Throwback to last Sunday's football match — resharing Arjun's recap. Great game, lads!",
        "image_url": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80",
        "is_reshared": True,
        "original_host_id": "org-arjun",
    },
    {
        "id": "post-futsal",
        "event_id": "evt-futsal",
        "author_id": "org-vikram",
        "type": "poster",
        "caption": "Friday futsal under the lights \u26bd Small-sided, high intensity — indoor shoes only.",
        "image_url": "https://images.unsplash.com/photo-1574629810360-7abca99b5a64?auto=format&fit=crop&w=800&q=80",
    },
    {
        "id": "post-badminton",
        "event_id": "evt-badminton",
        "author_id": "org-sneha",
        "type": "poster",
        "caption": "Badminton smash night \U0001f3f8 Timed rotations, all skill levels — rackets on rent.",
        "image_url": "https://images.unsplash.com/photo-1620595435019-9d5d14e54fe0?auto=format&fit=crop&w=800&q=80",
    },
    {
        "id": "post-skateboard",
        "event_id": "evt-skateboard",
        "author_id": "org-vikram",
        "type": "poster",
        "caption": "Skate plaza session this Sunday \U0001f6f9 Bring helmets — beginners welcome!",
        "image_url": "https://images.unsplash.com/photo-1542770665-66a0b85d33f5?auto=format&fit=crop&w=800&q=80",
    },
    {
        "id": "post-swimming",
        "event_id": "evt-swimming",
        "author_id": "org-priya",
        "type": "poster",
        "caption": "Morning lap swim at the aquatic center \U0001f3ca Technique drills + free swim lanes.",
        "image_url": "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=800&q=80",
    },
    {
        "id": "post-screening",
        "event_id": "evt-screening",
        "author_id": "org-ananya",
        "type": "poster",
        "caption": "Open-air movie night under the stars \U0001f3ac Blankets encouraged, snacks on us.",
        "image_url": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80",
    },
    {
        "id": "post-cosplaying",
        "event_id": "evt-cosplaying",
        "author_id": "org-ananya",
        "type": "poster",
        "caption": "Anime cosplay meetup at Forum Sujana \U0001f3ad Parade, photo booths and merch stalls!",
        "image_url": "https://images.unsplash.com/photo-1535295972055-1c7624482085?auto=format&fit=crop&w=800&q=80",
    },
    {
        "id": "post-yoga",
        "event_id": "evt-yoga",
        "author_id": "org-priya",
        "type": "poster",
        "caption": "Sunset yoga flow at KBR \U0001f9d8 Mats provided — breathe, stretch, unwind.",
        "image_url": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80",
    },
    {
        "id": "post-volleyball",
        "event_id": "evt-volleyball",
        "author_id": "org-rahul",
        "type": "poster",
        "caption": "Sand volleyball league signup open \U0001f3d0 4v4 format, floodlit courts at Necklace Road.",
        "image_url": "https://images.unsplash.com/photo-1612872085224-b08a92e221f6?auto=format&fit=crop&w=800&q=80",
        "registration_type": "limited",
        "slots_total": 16,
        "slots_filled": 10,
    },
    {
        "id": "post-hiking",
        "event_id": "evt-hiking",
        "author_id": "org-vikram",
        "type": "poster",
        "caption": "Gandipet hill trek at sunrise \u26f0\ufe0f Moderate trail, lake views — bring water!",
        "image_url": "https://images.unsplash.com/photo-1551632811-561732b04104?auto=format&fit=crop&w=800&q=80",
    },
    {
        "id": "post-crossfit",
        "event_id": "evt-crossfit",
        "author_id": "org-priya",
        "type": "poster",
        "caption": "Community CrossFit WOD — partner workout, scaled for every level \U0001f4aa",
        "image_url": "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80",
    },
    {
        "id": "post-pilates",
        "event_id": "evt-pilates",
        "author_id": "org-priya",
        "type": "poster",
        "caption": "Reformer Pilates class \U0001f9d8 Core, control and posture — mats and reformers provided.",
        "image_url": "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80",
    },
    {
        "id": "post-weightlifting",
        "event_id": "evt-weightlifting",
        "author_id": "org-arjun",
        "type": "poster",
        "caption": "Olympic weightlifting clinic \U0001f3cb\ufe0f Coached snatch + clean & jerk. Chalk up!",
        "image_url": "https://images.unsplash.com/photo-1534368959876-26bf04f2c947?auto=format&fit=crop&w=800&q=80",
    },
    {
        "id": "post-bodybuilding",
        "event_id": "evt-bodybuilding",
        "author_id": "org-arjun",
        "type": "poster",
        "caption": "Bodybuilding pump session \U0001f4aa Chest & back day — spotters on hand, all welcome.",
        "image_url": "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=800&q=80",
    },
    {
        "id": "post-calisthenics",
        "event_id": "evt-calisthenics",
        "author_id": "org-vikram",
        "type": "poster",
        "caption": "Calisthenics park workout \U0001f938 Pull-ups, dips, muscle-ups on the bars — all levels!",
        "image_url": "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&w=800&q=80",
    },
    {
        "id": "post-liveband",
        "event_id": "evt-liveband",
        "author_id": "org-dj-kiran",
        "type": "poster",
        "caption": "Indie live band night — three local acts back-to-back \U0001f3b8 Early entry before 8!",
        "image_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80",
    },
    {
        "id": "post-basketball-poster",
        "event_id": "evt-basketball",
        "author_id": "org-priya",
        "type": "poster",
        "caption": "3v3 basketball league is back \U0001f3c0 Register your squad — spots filling fast!",
        "image_url": "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80",
        "registration_type": "limited",
        "slots_total": 24,
        "slots_filled": 18,
    },
]


def format_date(day: date) -> str:
    """"Sun, July 26" — matches the frontend's en-US short-weekday/long-month."""
    return f"{day:%a, %B} {day.day}"


def format_time(at: str) -> str:
    """"9:00 AM" — matches the frontend's en-US 12-hour format."""
    hour, minute = (int(part) for part in at.split(":"))
    suffix = "AM" if hour < 12 else "PM"
    return f"{hour % 12 or 12}:{minute:02d} {suffix}"


def _starts_at(when: date, at: str) -> datetime:
    hour, minute = (int(part) for part in at.split(":"))
    return datetime.combine(when, dt_time(hour, minute), tzinfo=timezone.utc)


async def seed() -> None:
    await init_models()
    today = date.today()
    demo_event_ids = [item["id"] for item in DEMO_EVENTS]
    demo_post_ids = [item["id"] for item in DEMO_POSTS]

    starts_at_by_event: dict[str, datetime] = {}

    async with AsyncSessionLocal() as session:
        # Delete posts first (FK references events) and their likes, then events.
        await session.execute(delete(PostLike).where(PostLike.post_id.in_(demo_post_ids)))
        await session.execute(delete(Post).where(Post.id.in_(demo_post_ids)))
        await session.execute(delete(Event).where(Event.id.in_(demo_event_ids)))

        existing_org_ids = set(
            (
                await session.execute(
                    select(User.id).where(User.id.in_([o["id"] for o in DEMO_ORGANIZERS]))
                )
            )
            .scalars()
            .all()
        )
        for org in DEMO_ORGANIZERS:
            if org["id"] in existing_org_ids:
                continue  # never overwrite (shouldn't happen, but don't clobber a real account)
            session.add(
                User(
                    id=org["id"],
                    username=org["username"],
                    email=None,
                    password_hash=hash_password(uuid.uuid4().hex),  # NPC account, nobody can log in
                    full_name=org["full_name"],
                    bio=org["bio"],
                    location=org["location"],
                    avatar_url=org["avatar_url"],
                )
            )

        for item in DEMO_EVENTS:
            when = today + timedelta(days=item["days"])
            starts_at = _starts_at(when, item["at"])
            starts_at_by_event[item["id"]] = starts_at
            session.add(
                Event(
                    id=item["id"],
                    title=item["title"],
                    category=item["category"],
                    main_category=item["main_category"],
                    date=format_date(when),
                    time=format_time(item["at"]),
                    venue=item["venue"],
                    location=item.get("location", item["venue"]),
                    description=item["description"],
                    lat=item["lat"],
                    lng=item["lng"],
                    attendees=item["attendees"],
                    image=item["image"],
                    organizer_id=item["organizer_id"],
                    game_access="public",
                    invite_list_ids=[],
                    invited_member_ids=[],
                    starts_at=starts_at,
                )
            )

        for item in DEMO_POSTS:
            starts_at = starts_at_by_event[item["event_id"]]
            registration_type = item.get("registration_type")
            registration_deadline = starts_at - timedelta(hours=1) if registration_type == "limited" else None
            session.add(
                Post(
                    id=item["id"],
                    author_id=item["author_id"],
                    event_id=item["event_id"],
                    type=item.get("type", "text"),
                    caption=item.get("caption", ""),
                    image_url=item.get("image_url", ""),
                    video_url=item.get("video_url", ""),
                    visibility=item.get("visibility", "public"),
                    is_reshared=item.get("is_reshared", False),
                    original_host_id=item.get("original_host_id"),
                    registration_type=registration_type,
                    slots_total=item.get("slots_total"),
                    slots_filled=item.get("slots_filled", 0),
                    registration_deadline=registration_deadline,
                )
            )

        await session.commit()

        total_events = len((await session.execute(select(Event))).scalars().all())
        total_posts = len((await session.execute(select(Post))).scalars().all())

    print(
        f"Seeded {len(DEMO_ORGANIZERS) - len(existing_org_ids)} demo organizer accounts, "
        f"{len(DEMO_EVENTS)} demo events ({total_events} events), "
        f"and {len(DEMO_POSTS)} demo posts ({total_posts} posts) in the database."
    )


if __name__ == "__main__":
    asyncio.run(seed())
