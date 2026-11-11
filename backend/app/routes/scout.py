import time
import os
import re
import json
import hashlib
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Dict, Optional
from urllib.parse import parse_qsl, quote_plus, urlencode, urlsplit, urlunsplit
from fastapi import APIRouter, BackgroundTasks
import httpx
from bs4 import BeautifulSoup
try:
    from firecrawl import FirecrawlApp
except ImportError:
    FirecrawlApp = None

try:
    from ddgs import DDGS
    from ddgs.exceptions import DDGSException
except ImportError:
    from duckduckgo_search import DDGS
    from duckduckgo_search.exceptions import DuckDuckGoSearchException as DDGSException

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])

BASE_DIR = Path(r"D:\AIEngineer\ai_job_research_agent_full_project")
TARGET_FILE = str(BASE_DIR / "curated_jobs_strict_2yo.json")
REMOVED_FILE = str(BASE_DIR / "removed_jobs.json")

# AIDLC scoring stack keywords: base 70, +4 per matched group, cap 96
STACK_KEYWORD_GROUPS = [
    ("langgraph", ["langgraph"]),
    ("fastapi", ["fastapi"]),
    ("python", ["python"]),
    ("langchain", ["langchain"]),
    ("rag", ["rag", "retrieval augmented", "retrieval-augmented"]),
    ("vector_db", ["vector db", "vector database", "faiss", "pinecone", "weaviate", "chroma", "milvus", "qdrant"]),
    ("azure", ["azure", "azure openai"]),
    ("react", ["react", "reactjs"]),
    ("agentic", ["agentic", "multi-agent", "multi agent", "orchestration"]),
]

EXCLUDE_TITLE_PLAIN = [
    "director", "vp", "architect", "sdet", "qa", "quality assurance",
    "test automation", "tester", "devops", "data analyst", "data engineer",
    "business analyst", "sales", "marketing", "hr", "human resources",
    "recruiter", "finance", "accountant", "legal", "designer", "graphic",
]
EXCLUDE_TITLE_REGEX = [r"\bii\b", r"\biii\b", r"\biv\b", r"\bsr\b"]

# Remote-only indicators (zero tolerance)
REMOTE_KEYWORDS = [
    "remote", "us remote", "emea remote", "global telecommute",
    "work from home", "wfh", "anywhere", "100% remote", "fully remote",
    "remote-first", "telecommute", "virtual",
]

# Internship / trainee indicators (zero tolerance)
INTERN_KEYWORDS = [
    "intern", "internship", "interns", "trainee", "apprentice", "apprenticeship",
    "summer intern", "winter intern", "co-op", "coop", "rotation program",
]

# Strict Indian tech hubs only
HUB_PATTERNS: List[tuple[str, List[str]]] = [
    ("Bengaluru", ["bengaluru", "bangalore"]),
    ("Hyderabad", ["hyderabad", "secunderabad"]),
    ("Pune", ["pune"]),
    ("Mumbai", ["mumbai", "navi mumbai", "thane"]),
    ("Delhi NCR", ["gurugram", "gurgaon", "noida", "new delhi", "delhi ncr"]),
]
INDIA_CITY_PATTERNS: List[tuple[str, List[str]]] = [
    ("Chennai", ["chennai"]),
    ("Kolkata", ["kolkata", "calcutta"]),
    ("Ahmedabad", ["ahmedabad"]),
    ("Jaipur", ["jaipur"]),
    ("Kochi", ["kochi", "cochin"]),
    ("Chandigarh", ["chandigarh", "mohali"]),
    ("Indore", ["indore"]),
    ("Thiruvananthapuram", ["thiruvananthapuram", "trivandrum"]),
    ("Mysuru", ["mysuru", "mysore"]),
    ("Coimbatore", ["coimbatore"]),
]

SEARCH_QUERIES = [
    'site:boards.greenhouse.io ("AI Engineer" OR "Machine Learning Engineer" OR "Generative AI") India',
    'site:jobs.ashbyhq.com ("AI Engineer" OR "Machine Learning" OR "Generative AI") India',
    'site:apply.workable.com ("AI Engineer" OR "Machine Learning") India',
    'site:jobs.lever.co ("AI Engineer" OR "Machine Learning Engineer" OR "Generative AI") India',
    'site:*.keka.com/careers ("AI Engineer" OR "Machine Learning" OR "Generative AI") India',
    '"AI Engineer" Python (junior OR "entry level" OR "0-2 years") India',
    '"Generative AI Engineer" (LangChain OR LangGraph OR RAG) India',
    '"Machine Learning Engineer" Python (junior OR graduate) India',
    '"LLM Engineer" (Python OR FastAPI) India',
    '"AI/ML Engineer" (Azure OR AWS OR GCP) India',
    '"NLP Engineer" Python India (junior OR "0-2 years")',
    '"Computer Vision Engineer" Python India (junior OR entry)',
    '"AI Developer" Python India (junior OR "entry level")',
    '"Applied AI Engineer" India (junior OR "0-3 years")',
    '"AI Research Engineer" India',
    '"Machine Learning Developer" India',
    '"Prompt Engineer" India',
    '"Data Scientist" NLP Python India',
    '"Computer Vision Engineer" India',
    'site:boards.greenhouse.io/jobs Bengaluru ("AI Engineer" OR "ML Engineer" OR "AI Developer")',
    'site:boards.greenhouse.io/jobs Hyderabad ("AI Engineer" OR "ML Engineer" OR "AI Developer")',
    'site:boards.greenhouse.io/jobs Pune ("AI Engineer" OR "ML Engineer" OR "AI Developer")',
    'site:jobs.ashbyhq.com Bengaluru ("AI Engineer" OR "ML Engineer" OR "LLM Engineer")',
    'site:jobs.ashbyhq.com Hyderabad ("AI Engineer" OR "ML Engineer" OR "LLM Engineer")',
    'site:jobs.lever.co Bengaluru ("AI Engineer" OR "ML Engineer" OR "LLM Engineer")',
    'site:jobs.lever.co Hyderabad ("AI Engineer" OR "ML Engineer" OR "LLM Engineer")',
    'site:jobs.lever.co Pune ("AI Engineer" OR "ML Engineer" OR "LLM Engineer")',
    'site:apply.workable.com Bengaluru ("AI Engineer" OR "ML Engineer" OR "AI Developer")',
    'site:apply.workable.com Hyderabad ("AI Engineer" OR "ML Engineer" OR "AI Developer")',
    'site:apply.workable.com Pune ("AI Engineer" OR "ML Engineer" OR "AI Developer")',
    'site:*.keka.com/careers Hyderabad ("AI Engineer" OR "ML Engineer" OR "Generative AI" OR "Software Engineer")',
    'site:*.keka.com/careers Pune ("AI Engineer" OR "ML Engineer" OR "Generative AI" OR "Software Developer")',
    'site:*.keka.com/careers Chennai ("AI Engineer" OR "ML Engineer" OR "Generative AI" OR "Software Engineer")',
    'site:*.keka.com/careers Gurugram ("AI Engineer" OR "ML Engineer" OR "Generative AI" OR "Software Developer")',
    'site:boards.greenhouse.io ("AI Engineer" OR "Machine Learning" OR "Software Engineer") Chennai',
    'site:jobs.ashbyhq.com ("AI Engineer" OR "Machine Learning" OR "Software Developer") Chennai',
    'site:apply.workable.com ("AI Engineer" OR "Machine Learning" OR "Software Engineer") Chennai',
    '"Data Engineer" (AI OR LLM OR Machine Learning) India',
    '"Python Developer" (AI OR ML) India',
    '"Software Engineer" AI India',
    '"Software Developer" AI India',
    '"AI Researcher" India',
    '"LLM Specialist" India',
    'site:boards.greenhouse.io ("Generative AI" OR "LLM" OR "AI Engineer" OR "Software Engineer") India',
    'site:jobs.ashbyhq.com ("Generative AI" OR "LLM" OR "AI Engineer" OR "Software Developer") India',
    'site:apply.workable.com ("Generative AI" OR "LLM" OR "AI Engineer" OR "Software Engineer") India',
    'site:jobs.lever.co ("Generative AI" OR "LLM" OR "AI Engineer" OR "Software Developer") India',
    '"Backend Engineer" (AI OR Python OR ML) India',
    '"Full Stack Developer" AI India',
    '"Machine Learning Engineer" India',
    '"Python AI Developer" India',
]


FRESHNESS_DAYS = int(os.getenv("JOB_FRESHNESS_DAYS", "90"))
MAX_EXP_YEARS = int(os.getenv("MAX_EXP_YEARS", "2"))
MAX_SEARCH_QUERIES = int(os.getenv("MAX_SEARCH_QUERIES", str(len(SEARCH_QUERIES))))
MAX_RESULTS_PER_QUERY = int(os.getenv("MAX_RESULTS_PER_QUERY", "30"))
SCOUT_STATE = {
    "status": "idle",
    "message": "No scout run has completed.",
    "discovered": 0,
    "verified": 0,
}
ALLOWED_JOB_HOSTS = (
    "boards.greenhouse.io",
    "jobs.ashbyhq.com",
    "apply.workable.com",
    "jobs.lever.co",
)


def google_dork_urls() -> List[Dict[str, str]]:
    locations = {
        "Hyderabad": "Hyderabad India",
        "Bengaluru": "Bengaluru India",
        "Remote India": '"Remote" India',
    }
    queries = []
    for location, location_query in locations.items():
        queries.append((
            location,
            f'(site:boards.greenhouse.io OR site:jobs.ashbyhq.com OR '
            f'site:apply.workable.com OR site:jobs.lever.co OR site:*.keka.com/careers) '
            f'("AI Engineer" OR "Machine Learning Engineer" OR "Generative AI" OR "LLM Engineer") '
            f'("0-2 years" OR "0-3 years" OR "0-5 years" OR "0-8 years" OR junior OR "entry level") '
            f'{location_query} -intern -internship -trainee -apprentice '
            f'-site:linkedin.com -site:naukri.com',
        ))
    return [
        {"location": location, "query": query, "url": f"https://www.google.com/search?q={quote_plus(query)}"}
        for location, query in queries
    ]

def is_valid_deep_job_link(url: str) -> bool:
    parsed = urlsplit(url)
    host = parsed.netloc.lower().split("@")[-1].split(":")[0]
    clean_url = parsed.path.rstrip("/")
    parts = [part for part in clean_url.split("/") if part]
    if host == "boards.greenhouse.io":
        return "jobs" in parts and len(parts) >= 3
    if host == "jobs.ashbyhq.com":
        return len(parts) >= 2 and "careers" not in parts[-1]
    if host == "apply.workable.com":
        return len(parts) >= 2 and parts[0] != "company"
    if host == "jobs.lever.co":
        return len(parts) == 2 and parts[0] not in {"search", "departments"}
    if host.endswith(".keka.com") and host != "keka.com":
        return len(parts) >= 2 and "careers" in parts
    return False


def canonicalize_url(url: str) -> str:
    """Remove tracking parameters while preserving the application URL."""
    parts = urlsplit(url.strip())
    query = [(key, value) for key, value in parse_qsl(parts.query) if not key.lower().startswith(("utm_", "trk", "ref"))]
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path.rstrip("/"), urlencode(query), ""))


def job_fingerprint(job: Dict) -> str:
    raw = "|".join(
        str(job.get(key, "")).strip().lower()
        for key in ("company", "title", "location", "url")
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


# Messages indicating a job is closed / no longer open (Greenhouse, Lever, etc.)
CLOSED_JOB_MESSAGES = [
    "the job you are looking for is no longer open",
    "job no longer open",
    "no longer accepting applications",
    "this position has been filled",
    "position closed",
    "job closed",
    "no longer available",
    "expired",
    "not found",
    "page not found",
    "404",
    "410",
]

def is_url_live(url: str, client: httpx.Client, timeout: float = 6.0) -> bool:
    """HEAD/GET probe to confirm the page returns 2xx and is not a closed job page."""
    try:
        res = client.head(url, follow_redirects=True, timeout=timeout)
        if res.status_code >= 400:
            res = client.get(url, follow_redirects=True, timeout=timeout)
        if res.status_code >= 400:
            return False
        # Check page content for closed-job indicators
        text = res.text.lower()
        for msg in CLOSED_JOB_MESSAGES:
            if msg in text:
                print(f"[AIDLC SKIP: CLOSED JOB] {url} -> '{msg}'")
                return False
        return True
    except (httpx.HTTPError, ValueError):
        try:
            res = client.get(url, follow_redirects=True, timeout=timeout)
            if res.status_code >= 400:
                return False
            text = res.text.lower()
            for msg in CLOSED_JOB_MESSAGES:
                if msg in text:
                    print(f"[AIDLC SKIP: CLOSED JOB] {url} -> '{msg}'")
                    return False
            return True
        except (httpx.HTTPError, ValueError):
            return False

def search_ddg_jobs() -> List[str]:
    urls: List[str] = []
    try:
        ddgs = DDGS()
        for q in SEARCH_QUERIES[:MAX_SEARCH_QUERIES]:
            try:
                results = list(ddgs.text(q, max_results=MAX_RESULTS_PER_QUERY, safesearch="off", region="in-en"))
                for r in results:
                    href = canonicalize_url(r.get("href", ""))
                    if is_valid_deep_job_link(href):
                        urls.append(href)
            except (DDGSException, OSError, RuntimeError, TypeError, ValueError) as exc:
                print(f"[AIDLC SEARCH: DDG QUERY FAILED] {q}: {exc}")
            time.sleep(5.0) # Increased delay
    except (DDGSException, OSError, RuntimeError, TypeError) as exc:
        print(f"[AIDLC SEARCH: DDG UNAVAILABLE] {exc}")
    discovered = list(dict.fromkeys(urls))
    SCOUT_STATE.update(message=f"DDG discovery complete: {len(discovered)} ATS postings found.", discovered=len(discovered))
    return discovered


def search_bing_jobs(client: httpx.Client) -> List[str]:
    """Free HTML fallback for when DDG is unavailable or returns too few links."""
    urls: List[str] = []
    for query in SEARCH_QUERIES[:MAX_SEARCH_QUERIES]:
        try:
            response = client.get(
                "https://www.bing.com/search",
                params={"q": query, "count": MAX_RESULTS_PER_QUERY},
                timeout=8.0,
            )
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")
            for anchor in soup.select("li.b_algo h2 a[href]"):
                href = canonicalize_url(anchor["href"])
                if is_valid_deep_job_link(href):
                    urls.append(href)
        except (httpx.HTTPError, ValueError) as exc:
            print(f"[AIDLC SEARCH: BING QUERY FAILED] {query}: {exc}")
        time.sleep(1.0)
    discovered = list(dict.fromkeys(urls))
    SCOUT_STATE.update(message=f"Search fallback complete: {len(discovered)} ATS postings found.", discovered=len(discovered))
    return discovered


def search_google_jobs(client: httpx.Client) -> List[str]:
    """Use Google dorks as a second independent search source."""
    urls: List[str] = []
    locations = [
        "Bengaluru", "Hyderabad", "Pune", "Mumbai", "Gurugram", "Noida",
        "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Kochi", "Chandigarh",
        "Indore", "Coimbatore", "India",
    ]
    ats_sites = "site:boards.greenhouse.io OR site:jobs.ashbyhq.com OR site:apply.workable.com OR site:jobs.lever.co"
    roles = '"AI Engineer" OR "Machine Learning Engineer" OR "Generative AI" OR "LLM Engineer" OR "AI Developer"'
    for location in locations:
        query = (
            f"({ats_sites}) ({roles}) {location} India "
            '-intern -internship -trainee -apprentice -remote'
        )
        try:
            response = client.get(
                "https://www.google.com/search",
                params={"q": query, "num": MAX_RESULTS_PER_QUERY, "hl": "en", "gl": "in"},
                headers={"Accept-Language": "en-IN,en;q=0.9"},
                timeout=8.0,
            )
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")
            for anchor in soup.select("a[href]"):
                href = anchor.get("href", "")
                if href.startswith("/url?"):
                    href = dict(parse_qsl(urlsplit(href).query)).get("q", "")
                href = canonicalize_url(href)
                if is_valid_deep_job_link(href):
                    urls.append(href)
        except (httpx.HTTPError, ValueError) as exc:
            print(f"[AIDLC SEARCH: GOOGLE QUERY FAILED] {query}: {exc}")
        time.sleep(5.0) # Increased delay
    discovered = list(dict.fromkeys(urls))
    return discovered


def search_rss_jobs(client: httpx.Client) -> List[str]:
    urls: List[str] = []
    feeds = [feed.strip() for feed in os.getenv("JOB_RSS_FEEDS", "").split(",") if feed.strip()]
    for feed in feeds:
        try:
            response = client.get(feed, timeout=8.0)
            response.raise_for_status()
            root = ET.fromstring(response.content)
            for element in root.iter():
                if element.tag.rsplit("}", 1)[-1] in ("link", "url") and element.text:
                    href = canonicalize_url(element.text.strip())
                    if is_valid_deep_job_link(href):
                        urls.append(href)
        except (httpx.HTTPError, ET.ParseError, ValueError) as exc:
            print(f"[AIDLC SEARCH: RSS FEED FAILED] {feed}: {exc}")
    return list(dict.fromkeys(urls))


def search_firecrawl_jobs() -> List[str]:
    # Firecrawl is out of credits, skipping for now
    return []


def search_all_sources(client: httpx.Client) -> List[str]:
    ddg_urls = search_ddg_jobs()
    google_urls = search_google_jobs(client)
    bing_urls = search_bing_jobs(client) if len(ddg_urls) + len(google_urls) < 50 else []
    rss_urls = search_rss_jobs(client)
    firecrawl_urls = search_firecrawl_jobs()
    discovered = list(dict.fromkeys(ddg_urls + google_urls + bing_urls + rss_urls + firecrawl_urls))
    SCOUT_STATE.update(message=f"Discovery complete: validating {len(discovered)} ATS postings.", discovered=len(discovered))
    return discovered

def parse_experience_bounds(text: str) -> tuple[int, int]:
    normalized = re.sub(r'\s+', ' ', text)
    normalized = normalized.replace('–', '-').replace('—', '-').replace('&ndash;', '-')

    range_match = re.search(r'\b(\d{1,2})\s*(?:-|to)\s*(\d{1,2})\+?\s*(?:years?|yrs?)\b', normalized, re.IGNORECASE)
    if range_match:
        return int(range_match.group(1)), int(range_match.group(2))

    min_match = re.search(r'(?:\b(?:at least|minimum of|min)\s*(\d{1,2})\+?\s*(?:years?|yrs?)\b|\b(\d{1,2})\+\s*(?:years?|yrs?)\b)', normalized, re.IGNORECASE)
    if min_match:
        val = int(min_match.group(1) or min_match.group(2))
        return val, val + 2

    single_match = re.search(r'\b(\d{1,2})\s*(?:years?|yrs?)\s*(?:of\s*)?(?:hands[- ]on\s*)?(?:experience|exp)\b', normalized, re.IGNORECASE)
    if single_match:
        val = int(single_match.group(1))
        return val, val

    return 0, 0


def is_experience_compatible(text: str) -> bool:
    """Accept postings whose stated experience ceiling is within 3 years."""
    normalized = re.sub(r"\s+", " ", text.lower()).replace("–", "-").replace("—", "-")
    ranges = re.findall(r"\b(\d{1,2})\s*(?:-|to)\s*(\d{1,2})\+?\s*(?:years?|yrs?)\b", normalized)
    if ranges:
        # Allow ranges up to 3 years
        return any(int(upper) <= 3 for _, upper in ranges)
    minimum = re.search(r"\b(?:at least|minimum of|min)\s*(\d{1,2})\+?\s*(?:years?|yrs?)\b", normalized)
    if minimum:
        return int(minimum.group(1)) <= 3
    single = re.search(r"\b(\d{1,2})\s*(?:years?|yrs?)\s*(?:of\s*)?(?:hands[- ]on\s*)?(?:experience|exp)\b", normalized)
    return not single or int(single.group(1)) <= 3


def is_internship(title: str, text: str) -> bool:
    title_lower = title.lower()
    description = text.lower()[:3000]
    return any(
        re.search(rf"\b{re.escape(keyword)}\b", title_lower)
        or re.search(rf"\b{re.escape(keyword)}\b", description)
        for keyword in INTERN_KEYWORDS
    )


def is_recent_posting(value: str) -> bool:
    if not value:
        return True
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return True
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed >= datetime.now(timezone.utc) - timedelta(days=FRESHNESS_DAYS)

def detect_workplace_type(text_lower: str) -> str:
    if "hybrid" in text_lower:
        return "Hybrid"
    if "on-site" in text_lower or "onsite" in text_lower or "on site" in text_lower:
        return "On-site"
    return "On-site"

def detect_location(text_lower: str, title_lower: str) -> Optional[str]:
    blob = f"{title_lower} {text_lower}"

    # GATE 3 part A: zero-tolerance remote-only rejection
    for kw in REMOTE_KEYWORDS:
        if re.search(rf"\b{re.escape(kw)}\b", blob):
            return None

    # GATE 3 part B: must be physically in one of the 5 Indian tech hubs
    for hub, patterns in HUB_PATTERNS:
        for pat in patterns:
            if re.search(rf"\b{re.escape(pat)}\b", blob):
                return hub
    for city, patterns in INDIA_CITY_PATTERNS:
        for pat in patterns:
            if re.search(rf"\b{re.escape(pat)}\b", blob):
                return city
    if re.search(r"\bindia\b", blob):
        return "India"
    return None

def build_tailoring_blueprint(matched_skills: List[str]) -> List[str]:
    skill_bullets = {
        "langgraph": "Highlight multi-agent orchestration with LangGraph and reflection loops.",
        "fastapi": "Emphasize production FastAPI endpoints and WebSocket integration.",
        "python": "Highlight Python backend development and API design experience.",
        "langchain": "Highlight LangChain-based LLM application development.",
        "rag": "Emphasize RAG pipeline implementation and retrieval-augmented generation.",
        "vector_db": "Highlight vector database integration (FAISS) and semantic search.",
        "faiss": "Highlight vector database integration (FAISS) and semantic search.",
        "azure": "Emphasize Azure OpenAI and cloud AI service integration.",
        "azure openai": "Emphasize Azure OpenAI and human-in-the-loop review implementations.",
        "react": "Highlight React frontend development and component architecture.",
        "agentic": "Highlight agentic workflow design and multi-agent orchestration.",
        "multi-agent": "Highlight multi-agent orchestration with reflection loops.",
        "orchestration": "Highlight multi-agent orchestration with reflection loops.",
    }
    bullets = []
    for skill in matched_skills[:3]:
        key = skill.lower()
        bullets.append(skill_bullets.get(key, f"Emphasize {skill} experience in production systems."))
    while len(bullets) < 3:
        bullets.append("Demonstrate end-to-end AI system ownership and ATS-friendly keyword alignment.")
    return bullets[:3]


def resume_alignment_score(text: str, matched_skills: List[str]) -> int:
    """Use optional local resume text to boost skills that are actually present."""
    resume_text = os.getenv("RESUME_PROFILE_TEXT", "").lower()
    if not resume_text:
        return 0
    tokens = set(re.findall(r"[a-z0-9+#.-]{3,}", resume_text))
    matched = sum(1 for skill in matched_skills if skill.lower() in tokens or skill.lower().replace("_", " ") in resume_text)
    return min(12, matched * 2)

def extract_and_validate_posting(url: str, client: httpx.Client) -> Dict:
    try:
        url = canonicalize_url(url)
        title, text, ats_name = "", "", "Direct Career Portal"
        company_name = ""
        published_at = ""

        if "boards.greenhouse.io" in url:
            ats_name = "Greenhouse"
            parts = [p for p in url.split("/") if p]
            if "jobs" in parts:
                company = parts[parts.index("jobs") - 1]
                job_id = parts[parts.index("jobs") + 1].split("?")[0]
                res = client.get(f"https://boards-api.greenhouse.io/v1/boards/{company}/jobs/{job_id}", timeout=6.0)
                if res.status_code == 200:
                    data = res.json()
                    title = data.get("title", "")
                    published_at = data.get("updated_at", "") or data.get("created_at", "")
                    company_name = company.title()
                    soup = BeautifulSoup(data.get("content", ""), "html.parser")
                    text = soup.get_text(separator=" ")

        elif urlsplit(url).netloc.lower() == "apply.workable.com":
            ats_name = "Workable"
            parts = [part for part in urlsplit(url).path.split("/") if part]
            if len(parts) >= 3 and parts[1] == "j":
                company, job_id = parts[0], parts[2]
                markdown_url = f"https://apply.workable.com/{company}/jobs/view/{job_id}.md"
                res = client.get(markdown_url, timeout=7.0)
                if res.status_code == 200:
                    text = res.text
                    first_line = next((line for line in text.splitlines() if line.startswith("# ")), "")
                    title = first_line[2:].strip()
                    heading = re.search(r">\s*(.+?)\s+[�|]\s+(.+?)\s+[�|]\s+Posted", text)
                    if heading:
                        company_name = heading.group(1).strip()
                    else:
                        company_name = company.replace("-", " ").title()
                    posted = re.search(r"Posted\s+(\d{4}-\d{2}-\d{2})", text)
                    if posted:
                        published_at = posted.group(1)

        elif urlsplit(url).netloc.lower() == "jobs.lever.co":
            ats_name = "Lever"
            parts = [part for part in urlsplit(url).path.split("/") if part]
            if len(parts) == 2:
                company, job_id = parts
                res = client.get(
                    f"https://api.lever.co/v0/postings/{company}/{job_id}",
                    params={"mode": "json"},
                    timeout=7.0,
                )
                if res.status_code == 200:
                    data = res.json()
                    title = data.get("text", "")
                    company_name = company.replace("-", " ").title()
                    location = data.get("categories", {}).get("location", "")
                    text = " ".join(
                        str(data.get(field, ""))
                        for field in ("descriptionPlain", "lists", "additional")
                    )
                    text = f"{location} {text}"

        if not text:
            host = urlsplit(url).netloc.lower()
            ats_name = (
                "Ashby" if host == "jobs.ashbyhq.com"
                else "Workable" if host == "apply.workable.com"
                else "Keka" if host.endswith(".keka.com")
                else "Direct Career Portal"
            )
            res = client.get(url, timeout=7.0)
            if res.status_code == 200:
                soup = BeautifulSoup(res.text, "html.parser")
                h1 = soup.find("h1")
                if h1:
                    title = h1.get_text().strip()
                elif soup.title:
                    title = soup.title.get_text().split(" - ")[0].split(" | ")[0].strip()
                text = soup.get_text(separator=" ")
                company_name = url.replace("https://", "").split("/")[1].title()
                json_ld = soup.find("script", type="application/ld+json")
                if json_ld:
                    try:
                        structured = json.loads(json_ld.get_text())
                        if isinstance(structured, dict):
                            published_at = structured.get("datePosted", "")
                    except json.JSONDecodeError:
                        pass

        if not text or not title or len(text) < 100:
            return None

        title_lower = title.lower()
        text_lower = text.lower()

        # GATE 1: Early-career experience compatibility.
        min_exp, max_exp = parse_experience_bounds(text)
        if not is_experience_compatible(text):
            print(f"[AIDLC REJECT: SENIOR EXP ({min_exp}-{max_exp} yrs)] {title} ({company_name})")
            return None

        if is_internship(title, text):
            print(f"[AIDLC REJECT: INTERNSHIP] {title}")
            return None

        if not is_recent_posting(published_at):
            print(f"[AIDLC REJECT: STALE POSTING] {title} ({published_at})")
            return None

        # GATE 2: Senior / non-engineering title elimination
        for bad in EXCLUDE_TITLE_PLAIN:
            if re.search(rf"\b{re.escape(bad)}\b", title_lower):
                print(f"[AIDLC REJECT: TITLE] {title}")
                return None
        for pattern in EXCLUDE_TITLE_REGEX:
            if re.search(pattern, title_lower):
                print(f"[AIDLC REJECT: TITLE] {title}")
                return None

        # GATE 3: Prefer known Indian hubs and reject remote-only listings.
        location = detect_location(text_lower, title_lower)
        if location is None:
            print(f"[AIDLC REJECT: LOCATION/REMOTE] {title}")
            return None

        workplace_type = detect_workplace_type(text_lower)

        # AI relevance check
        AI_KEYWORDS = [
            "artificial intelligence", "machine learning", "ml ", "ai ", "llm",
            "generative ai", "gen ai", "deep learning", "nlp", "neural network",
            "langchain", "langgraph", "rag", "pytorch", "tensorflow",
            "computer vision", "hugging face", "transformers", "data science",
        "mlops", "prompt engineering", "ai engineer", "ai developer",
        "ml engineer", "ml developer", "generative", "machine-learning",
        "artificial-intelligence", "llmops", "vector search", "semantic search",
        "chatgpt", "claude", "gemini", "llama", "fine-tuning", "training",
        "inference", "neural", "deep-learning", "pytorch", "tensorflow",
        "langchain", "langgraph", "rag", "software", "application", "development"
        ]

        blob = f"{title_lower} {text_lower[:1500]}"
        if not any(k in blob for k in AI_KEYWORDS):
            print(f"[AIDLC REJECT: NOT AI-RELATED] {title}")
            return None

        # Matched stack skills & alignment score
        matched_skills = [
            name for name, aliases in STACK_KEYWORD_GROUPS
            if any(a in text_lower or a in title_lower for a in aliases)
        ]
        if not matched_skills:
            return None

        score = min(100, 70 + (len(matched_skills) * 4) + resume_alignment_score(text_lower, matched_skills))

        if min_exp == 0 and max_exp == 0:
            exp_label = "0-2 Years"
        else:
            exp_label = f"{min_exp}-{max_exp} Years"

        return {
            "id": f"job-{hashlib.sha256(url.encode('utf-8')).hexdigest()[:16]}",
            "title": title.split(" - ")[0].strip(),
            "company": company_name.replace("-", " "),
            "location": location,
            "workplace_type": workplace_type,
            "ats": ats_name,
            "url": url,
            "experience_range": exp_label,
            "match_score": score,
            "matched_skills": [s.title() for s in matched_skills[:6]],
            "tailoring_blueprint": build_tailoring_blueprint(matched_skills[:3]),
            "published_at": published_at or None,
            "last_verified": datetime.now(timezone.utc).isoformat(),
        }
    except (httpx.HTTPError, ValueError, KeyError, IndexError, AttributeError, TypeError, json.JSONDecodeError) as exc:
        print(f"[AIDLC EXTRACT: FAILED] {url}: {exc}")
        return None

def _load_removed() -> set:
    try:
        with open(REMOVED_FILE, "r", encoding="utf-8") as f:
            removed = json.load(f)
        if not isinstance(removed, list):
            raise ValueError("Expected a JSON array.")
        return set(item for item in removed if isinstance(item, str))
    except FileNotFoundError:
        return set()
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"[AIDLC HISTORY: REMOVED FILE UNREADABLE] {exc}")
        return set()

def _save_removed(removed: set):
    with open(REMOVED_FILE, "w", encoding="utf-8") as f:
        json.dump(sorted(removed), f, indent=2)

def run_full_deep_scout():
    SCOUT_STATE.update(status="running", message="Searching allowed ATS providers.", discovered=0, verified=0)
    try:
        with httpx.Client(headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}, follow_redirects=True) as client:
            urls = search_all_sources(client)
            SCOUT_STATE["discovered"] = len(urls)
            removed = _load_removed()
            verified_jobs = []
            seen_fingerprints = set()
            for url in urls:
                url = canonicalize_url(url)
                if url in removed:
                    continue
                if not is_url_live(url, client):
                    print(f"[AIDLC SKIP: DEAD LINK] {url}")
                    continue
                job = extract_and_validate_posting(url, client)
                if job:
                    fingerprint = job_fingerprint(job)
                    if fingerprint in seen_fingerprints or fingerprint in removed:
                        continue
                    job["fingerprint"] = fingerprint
                    verified_jobs.append(job)
                    seen_fingerprints.add(fingerprint)

        existing_jobs = []
        if os.path.exists(TARGET_FILE):
            try:
                with open(TARGET_FILE, "r", encoding="utf-8") as f:
                    existing_jobs = json.load(f)
            except (OSError, json.JSONDecodeError) as exc:
                print(f"[AIDLC HISTORY: CURATED FILE UNREADABLE] {exc}")

        candidates = existing_jobs + verified_jobs
        merged_by_fingerprint = {}
        for job in candidates:
            fingerprint = job_fingerprint(job)
            if (
                job.get("last_verified")
                and is_valid_deep_job_link(job.get("url", ""))
                and fingerprint not in removed
                and job.get("id") not in removed
            ):
                merged_by_fingerprint[fingerprint] = job

        merged = sorted(merged_by_fingerprint.values(), key=lambda x: x["match_score"], reverse=True)[:50]
        with open(TARGET_FILE, "w", encoding="utf-8") as f:
            json.dump(merged, f, indent=2)
        SCOUT_STATE.update(
            status="completed",
            message=f"Completed: {len(merged)} active ATS jobs verified.",
            verified=len(merged),
        )
    except (OSError, httpx.HTTPError, RuntimeError, ValueError) as exc:
        SCOUT_STATE.update(status="failed", message=f"Scout failed: {exc}")
        print(f"[AIDLC SCOUT: FAILED] {exc}")

@router.get("/curated", response_model=List[Dict])
async def get_curated_jobs():
    if os.path.exists(TARGET_FILE):
        with open(TARGET_FILE, "r", encoding="utf-8") as f:
            try:
                removed = _load_removed()
                return [
                    job for job in json.load(f)
                    if job.get("last_verified")
                    and is_valid_deep_job_link(job.get("url", ""))
                    and job.get("fingerprint") not in removed
                    and job.get("id") not in removed
                ]

            except (OSError, json.JSONDecodeError):
                return []
    return []

@router.get("/removed", response_model=List[str])
async def get_removed_jobs():
    return sorted(_load_removed())


@router.get("/search-links", response_model=List[Dict[str, str]])
async def get_search_links():
    return google_dork_urls()


@router.get("/scout-status", response_model=Dict)
async def get_scout_status():
    return dict(SCOUT_STATE)


@router.delete("/curated/{job_id}")
async def remove_job(job_id: str):
    removed = _load_removed()
    removed.add(job_id)

    removed_job = None
    if os.path.exists(TARGET_FILE):
        try:
            with open(TARGET_FILE, "r", encoding="utf-8") as f:
                jobs = json.load(f)
        except (OSError, json.JSONDecodeError) as exc:
            print(f"[AIDLC HISTORY: JOB FILE UNREADABLE] {exc}")
            jobs = []
        removed_job = next((job for job in jobs if job.get("id") == job_id), None)
        if removed_job:
            removed.update(value for value in (
                removed_job.get("url"),
                removed_job.get("fingerprint") or job_fingerprint(removed_job),
            ) if value)
        jobs = [j for j in jobs if j.get("id") != job_id]
        with open(TARGET_FILE, "w", encoding="utf-8") as f:
            json.dump(jobs, f, indent=2)
    _save_removed(removed)

    return {"status": "removed", "job_id": job_id}


@router.post("/curated/{job_id}/applied")
async def mark_job_applied(job_id: str):
    if not os.path.exists(TARGET_FILE):
        return {"status": "not_found", "job_id": job_id}
    with open(TARGET_FILE, "r", encoding="utf-8") as f:
        jobs = json.load(f)
    applied_job = next((job for job in jobs if job.get("id") == job_id), None)
    if not applied_job:
        return {"status": "not_found", "job_id": job_id}
    removed = _load_removed()
    removed.update(value for value in (
        job_id,
        applied_job.get("url"),
        applied_job.get("fingerprint") or job_fingerprint(applied_job),
    ) if value)
    _save_removed(removed)
    with open(TARGET_FILE, "w", encoding="utf-8") as f:
        json.dump([job for job in jobs if job.get("id") != job_id], f, indent=2)
    return {"status": "applied", "job_id": job_id}

@router.post("/trigger-search")
async def trigger_search(background_tasks: BackgroundTasks):
    if SCOUT_STATE["status"] == "running":
        return {"status": "running", "message": "A scout run is already in progress."}
    background_tasks.add_task(run_full_deep_scout)
    return {"status": "started", "message": "Scout started.", "status_url": "/api/jobs/scout-status"}
