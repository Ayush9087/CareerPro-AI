import asyncio
from app.api.deps import get_db
from app.api.v1.endpoints.roles import list_roles

async def test():
    try:
        gen = get_db()
        db = await anext(gen)
        res = await list_roles(db)
        print("SUCCESS:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test())
