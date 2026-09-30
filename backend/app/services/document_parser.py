import io
from pypdf import PdfReader
import docx

MAX_RESUME_PAGES = 100
MAX_EXTRACTED_TEXT_CHARS = 1_000_000

def parse_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF file."""
    reader = PdfReader(io.BytesIO(file_bytes), strict=True)
    if len(reader.pages) > MAX_RESUME_PAGES:
        raise ValueError("PDF has too many pages to process.")
    text = []
    total_chars = 0
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            total_chars += len(page_text) + 1
            if total_chars > MAX_EXTRACTED_TEXT_CHARS:
                raise ValueError("Extracted document text exceeds the processing limit.")
            text.append(page_text)
    return "\n".join(text).strip()

def parse_docx(file_bytes: bytes) -> str:
    """Extract text from a DOCX file."""
    doc = docx.Document(io.BytesIO(file_bytes))
    text = []
    total_chars = 0
    for para in doc.paragraphs:
        text.append(para.text)
        total_chars += len(para.text) + 1
        if total_chars > MAX_EXTRACTED_TEXT_CHARS:
            raise ValueError("Extracted document text exceeds the processing limit.")
    return "\n".join(text).strip()

def extract_text_from_document(file_bytes: bytes, filename: str) -> str:
    """Extract text from a document based on its extension."""
    filename = filename.lower()
    if filename.endswith(".pdf"):
        return parse_pdf(file_bytes)
    elif filename.endswith(".docx"):
        return parse_docx(file_bytes)
    else:
        raise ValueError("Unsupported file format. Only PDF and DOCX are supported.")
