import asyncio

import asyncpg

from app.config import get_settings


async def main() -> None:
    url = get_settings().database_url.replace("postgresql+asyncpg://", "postgresql://")
    try:
        conn = await asyncpg.connect(dsn=url)
        print("DB connection: OK")
        await conn.close()
    except Exception as exc:
        print(f"DB connection: FAIL — {type(exc).__name__}: {exc}")


if __name__ == "__main__":
    asyncio.run(main())
