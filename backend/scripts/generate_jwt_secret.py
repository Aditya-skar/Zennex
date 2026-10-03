"""Print a URL-safe secret for JWT_SECRET / production deploy."""
import secrets

if __name__ == "__main__":
    print(secrets.token_urlsafe(48))
