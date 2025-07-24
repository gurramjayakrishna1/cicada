import asyncio
import asyncpg

DATABASE_URL = "postgres://postgres:abAB%23us8096838028@database-1-instance-1.ci38iy8iegvd.us-east-1.rds.amazonaws.com:5432/postgres"

async def test_connection():
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        result = await conn.fetch("SELECT version();")
        print("✅ Connected to PostgreSQL!")
        print("📄 Version:", result[0]["version"])
        await conn.close()
    except Exception as e:
        print("❌ Connection failed:", e)

if __name__ == "__main__":
    asyncio.run(test_connection())
