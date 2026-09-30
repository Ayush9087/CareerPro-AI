"""Fail-closed validation for uploaded resume documents."""

from pathlib import PurePath
from io import BytesIO
from zipfile import BadZipFile, ZipFile

from fastapi import HTTPException, status

MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024
MAX_DOCX_EXPANDED_BYTES = 50 * 1024 * 1024
MAX_DOCX_ENTRIES = 2000

PDF_MIME = "application/pdf"
DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def validate_resume_file(file_bytes: bytes, filename: str | None, content_type: str | None) -> str:
    if not filename or len(filename) > 255 or "\x00" in filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resume filename.")
    extension = PurePath(filename.replace("\\", "/")).suffix.lower()
    if len(file_bytes) > MAX_RESUME_SIZE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail="Resume must be 5 MB or smaller.")
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resume file is empty.")

    if extension == ".pdf":
        is_pdf_mime = (
            content_type in (PDF_MIME, "application/x-pdf", "application/octet-stream")
            or (content_type and "pdf" in content_type.lower())
        )
        if not is_pdf_mime or not file_bytes.startswith(b"%PDF-"):
            raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Upload a valid PDF file.")
        return extension

    if extension == ".docx":
        is_docx_mime = (
            content_type in (DOCX_MIME, "application/octet-stream", "application/zip", "application/x-zip-compressed")
            or (content_type and ("wordprocessingml" in content_type or "docx" in content_type))
        )
        if not is_docx_mime or not file_bytes.startswith(b"PK"):
            raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Upload a valid DOCX file.")
        try:
            with ZipFile(BytesIO(file_bytes)) as archive:
                entries = archive.infolist()
                if len(entries) > MAX_DOCX_ENTRIES:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="DOCX archive contains too many entries.")
                if sum(entry.file_size for entry in entries) > MAX_DOCX_EXPANDED_BYTES:
                    raise HTTPException(status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail="DOCX content is too large to process.")
                if any(entry.flag_bits & 0x1 for entry in entries):
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Encrypted DOCX files are not supported.")
                names = {entry.filename for entry in entries}
                if "[Content_Types].xml" not in names or "word/document.xml" not in names:
                    raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Upload a valid DOCX document.")
                if any(name.startswith(("/", "\\")) or ".." in PurePath(name).parts for name in names):
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="DOCX archive contains invalid paths.")
        except BadZipFile as error:
            raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Upload a valid DOCX document.") from error
        return extension

    raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Only PDF and DOCX files are allowed.")