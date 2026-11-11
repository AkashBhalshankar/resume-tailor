# Job Search Specification

## 1. Goal

Produce up to 50 fresh, active, relevant AI-related job listings per day for the
user to review and apply to manually.

The system must not claim that 50 qualifying jobs exist when fewer than 50 can
be verified. In that case, it must return the verified count and explain why
the target was not reached.

## 2. Relevance requirements

A job is relevant only when all of the following are true:

1. The role is materially related to artificial intelligence, machine learning,
   generative AI, LLMs, NLP, computer vision, data science with an AI/ML focus,
   or an equivalent AI engineering role.
2. The required experience is compatible with an early-career candidate:
   - explicit ranges such as `0-2`, `0-3`, `0-5`, or `0-8` years are allowed;
   - entry-level, graduate, trainee, intern, and junior roles are allowed;
   - a role with an upper bound above 8 years is not acceptable unless the
     listing clearly states that it also accepts early-career applicants;
   - roles requiring senior, lead, principal, staff, manager, director, or
     equivalent experience are excluded.
3. The listing contains enough information to identify the employer, title, and
   application URL.
4. The listing is not an internship, trainee, apprenticeship, co-op, or
   equivalent temporary learning role.

Experience must be evaluated from the job page text, not from search-result
snippets alone. If the experience requirement is missing or ambiguous, the
job must be marked `needs_review` or excluded from the daily verified list.

## 3. Active-job requirements

Every job shown in the verified list must pass an availability check:

- the URL resolves successfully and is not a 404, 410, redirect loop, timeout,
  or server error;
- the page is an actual job-detail page with an application action or clear
  application instructions;
- the page does not state that the job is closed, expired, filled, withdrawn,
  no longer available, or removed;
- the page was checked recently enough for the configured freshness window.
- listings with a known posting date older than the configured freshness window
  are excluded.

Failed checks must exclude the job from the verified list and record the reason
for diagnostics. Search-engine result pages are discovery sources only and are
never valid application URLs.

## 4. Discovery strategy

Use multiple free discovery queries, restricted to these direct ATS portals:

1. Keka career pages matching `*.keka.com/careers`.
2. Greenhouse postings on `boards.greenhouse.io`.
3. Ashby postings on `jobs.ashbyhq.com`.
4. Workable postings on `apply.workable.com`.
5. Targeted Google-style queries/dorks for discovery.
6. DDG search as the primary metasearch fallback.
7. Bing as an additional permitted public-search fallback.

LinkedIn, Naukri, job aggregators, Workday, Lever, SmartRecruiters, and
account-creation platforms are excluded. Search results are only discovery
inputs; the output must contain the specific direct ATS posting URL.

The implementation must respect each site's terms, robots.txt where applicable,
rate limits, and access restrictions. It must not bypass authentication,
CAPTCHAs, paywalls, or anti-bot controls.

Discovery must use multiple role, skill, location, experience, and ATS queries.
A source failure must be explicit and must not produce fabricated or
success-shaped results.

## 5. Deduplication and persistence

Before ranking, normalize URLs and deduplicate jobs using a stable fingerprint
based on employer, normalized title, location, and canonical application URL.

The current implementation stores the active curated list in
`curated_jobs_strict_2yo.json` and removed/applied job identifiers in
`removed_jobs.json`. Those identifiers are excluded from later searches.
This lightweight persistence does not retain a complete status timeline,
rejection reasons, or source-verification history.

## 6. Ranking and output

Rank verified jobs using transparent signals:

- AI-role relevance;
- match to the user's resume skills;
- experience-level fit;
- location/work-mode fit;
- freshness;
- source and page-verification confidence.

Return the highest-ranked verified jobs, up to 50 per daily run. Each result must
include at least the title, company, location, experience evidence, source,
last-verified time, and application URL.

The system must distinguish `verified`, `needs_review`, and `rejected` results
and must never present unverified jobs as active recommendations.

## 7. Explicit non-goals and constraints

- Do not automatically submit applications, create accounts, or send messages
  without a separate explicit user instruction and confirmation.
- Do not include LinkedIn, Naukri, aggregators, Lever, Workday, SmartRecruiters,
  or any account-creation platform.
- Do not invent job details, URLs, experience requirements, or verification
  results.
- Do not include broken, stale, closed, duplicate, or already-removed jobs in
  the verified list.
- Do not guarantee 50 jobs when the available verified inventory is smaller.
- Do not rely on one search provider or one query.
- Do not scrape restricted pages or evade technical protections.
- Keep requests rate-limited, use timeouts and retries with backoff, and log
  source failures without hiding them.

## 8. Acceptance criteria

A daily run is successful only when:

1. Every displayed job satisfies the relevance and active-job requirements.
2. No displayed jobs share the same fingerprint.
3. Previously removed or applied jobs are absent.
4. Each displayed URL has a recent successful verification record.
5. The result count is the verified count, capped at 50, with short diagnostics
   when fewer than 50 jobs are available.
6. Every application URL belongs to an allowed direct ATS host and identifies a
   specific open posting.
