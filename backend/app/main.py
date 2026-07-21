from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="SIMSOR API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten when you have real web origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class UserProfile(BaseModel):
    id: str
    username: str
    fullName: str
    bio: str = ""
    location: str = ""
    avatarUrl: str = ""
    sports: list[str] = Field(default_factory=list)
    entertainment: list[str] = Field(default_factory=list)


class AuthSession(BaseModel):
    token: str
    user: UserProfile


class LoginBody(BaseModel):
    username: str
    password: str


class SignupBody(BaseModel):
    username: str
    password: str
    fullName: str
    email: str | None = None


# In-memory stub store — replace with DB when you build for real
_USERS: dict[str, dict] = {}


def _demo_user(username: str, full_name: str) -> UserProfile:
    return UserProfile(
        id=f"usr_{username}",
        username=username,
        fullName=full_name,
        bio="Sports Enthusiast • Event Explorer",
        location="Hyderabad, India",
        avatarUrl="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&h=300&q=80",
        sports=["Cricket", "Football"],
        entertainment=["Music", "Food Events"],
    )


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/auth/login", response_model=AuthSession)
def login(body: LoginBody):
    if len(body.username) < 3 or len(body.password) < 3:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    user = _demo_user(body.username.lower(), body.username if body.username != "admin" else "Admin User")
    _USERS[user.id] = user.model_dump()
    return AuthSession(token=f"dev-token-{user.id}", user=user)


@app.post("/api/auth/signup", response_model=AuthSession)
def signup(body: SignupBody):
    user = _demo_user(body.username.lower(), body.fullName)
    _USERS[user.id] = user.model_dump()
    return AuthSession(token=f"dev-token-{user.id}", user=user)


@app.post("/api/auth/logout")
def logout():
    return {"ok": True}


@app.get("/api/me", response_model=UserProfile)
def me():
    # TODO: read Bearer token and load user from DB
    if not _USERS:
        return _demo_user("admin", "Admin User")
    return UserProfile(**next(iter(_USERS.values())))


@app.patch("/api/me", response_model=UserProfile)
def update_me(patch: dict):
    current = me().model_dump()
    current.update({k: v for k, v in patch.items() if v is not None})
    _USERS[current["id"]] = current
    return UserProfile(**current)


@app.get("/api/events")
def list_events():
    # TODO: query DB / geo index
    return []


@app.post("/api/events")
def create_event(payload: dict):
    # TODO: persist
    return {**payload, "id": "evt_todo", "attendees": payload.get("attendees", 0)}
