# 🚀 CareerPro AI: The Career Readiness Engine

> "Know where you stand. Know exactly what to do next."

## 🌟 Project Overview
CareerPro AI is an end-to-end career acceleration platform that transforms the vague process of "job prep" into a precise engineering problem. By implementing the **ASSESS $\rightarrow$ DIAGNOSE $\rightarrow$ PLAN $\rightarrow$ PROVE $\rightarrow$ TRACK** loop, it provides students with a deterministic path to employability.

### The Core Problem
Students often suffer from "preparation anxiety"—they study everything but know nothing about their actual readiness relative to the current market.

### The Solution
A closed-loop system that uses LLMs to map resumes to market requirements, generate personalized learning paths, and validate skills via AI-driven interviews.

---

## 🏗️ Architecture
### System Flow
`Frontend (React)` $\longleftrightarrow$ `Backend (FastAPI)` $\longleftrightarrow$ `AI Engine (Gemini Pro)` $\longleftrightarrow$ `Data Layer (Supabase)`

- **Frontend**: Single Page Application (SPA) focused on a seamless transition between the five loop phases.
- **Backend**: Asynchronous REST API handling complex AI orchestration and state management.
- **AI Engine**: Utilizes Gemini Pro for semantic analysis, roadmap generation, and conversational interviewing.
- **Data Layer**: PostgreSQL with `pgvector` for semantic skill matching and Supabase Auth for secure session management.

---

## 🛠️ Tech Stack
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons.
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy, Pydantic.
- **Database/Auth**: Supabase (PostgreSQL, Auth, Storage).
- **AI/ML**: Google Gemini API (Pro & Flash), Embeddings.
- **External APIs**: Adzuna (Real-time job market intelligence).
- **DevOps**: Alembic (Migrations), Pydantic Settings.

---

## 🚀 Setup Guide

### Prerequisites
- Python 3.11+
- Node.js 18+
- Supabase Account

### Environment Variables
Create a `.env` file in `/backend` with:
```env
SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
SUPABASE_JWT_SECRET=your_secret
DATABASE_URL=postgresql://...
GEMINI_API_KEY=your_api_key
ADZUNA_APP_ID=your_id
ADZUNA_APP_KEY=your_key
```

### Installation
1. **Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   alembic upgrade head
   python app/main.py
   ```
2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## 🔑 Demo Credentials
- **User**: Alex (Student Persona)
- **Email**: `alex@demo.careerpro.ai`
- **Password**: `DemoPassword123!`
- **Fast-Track**: Use the "Use Demo Persona" button on the onboarding page to skip manual data entry.

---

## 🔌 API Documentation
| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/v1/resumes/upload` | POST | Parses resume and performs initial AI analysis. |
| `/api/v1/readiness/score` | GET | Calculates the weighted readiness score. |
| `/api/v1/roadmap/generate` | POST | Creates a personalized 30-day action plan. |
| `/api/v1/interviews/start` | POST | Initializes an AI-driven mock interview session. |

---

## 🛡️ Security
- **Row Level Security (RLS)**: Implemented in Supabase to ensure users can only access their own profiles and roadmaps.
- **JWT Authentication**: Secure token-based auth for all API requests.
- **Secret Management**: Pydantic-based environment variable validation.

---

## ⚠️ Known Limitations
- **Resume Parsing**: Complex PDF layouts may occasionally lead to parsing inaccuracies.
- **Interview Latency**: LLM response times can vary based on prompt complexity.
