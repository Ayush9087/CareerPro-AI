import asyncio
from supabase import create_client, Client
from app.core.config import get_settings

def get_supabase_client() -> Client:
    settings = get_settings()
    url: str = settings.supabase_url
    key: str = settings.supabase_service_role_key
    return create_client(url, key)

async def upload_file_to_storage(file_bytes: bytes, bucket_name: str, file_path: str, content_type: str) -> str:
    """
    Uploads a file to Supabase storage.
    Returns the private object path. The bucket must already exist and be private.
    """
    def upload() -> str:
        supabase = get_supabase_client()
        bucket = supabase.storage.get_bucket(bucket_name)
        if bucket.public:
            raise RuntimeError("Resume storage bucket must be private.")
        supabase.storage.from_(bucket_name).upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": content_type, "upsert": "false"},
        )
        return file_path

    return await asyncio.to_thread(upload)


async def create_private_signed_url(bucket_name: str, file_path: str, expires_in: int = 60) -> str:
    """Create a short-lived signed URL for a previously ownership-checked object."""
    if not 1 <= expires_in <= 300:
        raise ValueError("Signed URL expiry must be between 1 and 300 seconds.")
    def create_url() -> str:
        supabase = get_supabase_client()
        bucket = supabase.storage.get_bucket(bucket_name)
        if bucket.public:
            raise RuntimeError("Resume storage bucket must be private.")
        result = supabase.storage.from_(bucket_name).create_signed_url(file_path, expires_in)
        signed_url = result.get("signedURL") or result.get("signedUrl")
        if not signed_url:
            raise RuntimeError("Storage provider did not return a signed URL.")
        return signed_url

    return await asyncio.to_thread(create_url)
