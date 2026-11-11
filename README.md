# Deep Research Agent for Jobs

Production-grade ATS discovery pipeline combining:
1. **FastAPI Backend (`backend/`)**: Direct ATS harvester (Greenhouse / Lever / Ashby), strict <= 2 YoE gating, and physical-India-only filtering.
2. **React + Vite Frontend (`frontend/`)**: Curated job feed with live "Run Deep Scout Now" trigger.

## Quick Start

### 1. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

## API Endpoints
- `GET /api/jobs/curated` — returns the verified job list.
- `POST /api/jobs/trigger-search` — triggers a background deep scout run.

## Job scout behavior

The scout uses multiple free, targeted search queries (including Google-dork syntax), DDG first, Google and Bing HTML
fallbacks, and direct ATS extraction limited
to Keka, Greenhouse, Ashby, and Workable links. LinkedIn, Naukri, aggregators,
and account-creation platforms are excluded. Results are canonicalized,
validated for an active job page,
filtered for AI relevance, early-career experience, non-internship status,
freshness, and on-site Indian locations, deduplicated, ranked, and capped at
50. Listings with known posting dates older than `JOB_FRESHNESS_DAYS` (45 by
default) are excluded. Because availability varies, fewer than 50 results is
valid when fewer than 50 listings pass every verification gate. The scout
searches 15 queries by default and requests up to 15 results per query;
`MAX_SEARCH_QUERIES` and `MAX_RESULTS_PER_QUERY` can be increased in `.env`.
Previously verified listings are retained and merged with newly verified
listings on subsequent runs, subject to removal and deduplication rules.

Curated jobs are stored in the root `curated_jobs_strict_2yo.json` file;
removed and applied job identifiers are stored in the root `removed_jobs.json`
file and excluded from later searches. Set `JOB_RSS_FEEDS` in `backend/.env`
to add comma-separated public feed URLs. The scout does not submit applications
automatically. `RESUME_PROFILE_TEXT` can contain local resume skills/summary to
add a deterministic resume-alignment score; it is not sent to search providers.
Ready-to-run Google dork URLs are available at `GET /api/jobs/search-links` for
Hyderabad, Bengaluru, and Remote India. Remote India links are provided for
discovery only; remote listings remain excluded from the verified feed.