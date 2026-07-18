---
title: Spindle
kind: software
year: 2026
order: 4
description: SEO216's modular AI content engine — turns raw SEO/GEO signals into reviewed, published, bilingual content for the DACH market
repo: https://github.com/azizmokhtar/spindle
tech:
  - Python
  - FastAPI
  - HTMX
  - Postgres
  - pgvector
  - Redis
  - Dramatiq
  - Anthropic
  - Docker
  - Alembic
related:
  - title: Building a Reliable LLM API Client
    url: /tutorials/llm-api-client
  - title: How Signal Sources Improve LLM Writing Quality
    url: /tutorials/signal-sources-llm-quality
  - title: Setting Up Astro 5 with Tailwind CSS v4
    url: /tutorials/astro-tailwind-setup
  - title: GDPR-Compliant Cookie Consent with Google Consent Mode v2
    url: /tutorials/gdpr-cookie-consent
  - title: Schema.org Structured Data for Local Businesses
    url: /tutorials/schema-org-local-business
---

### The Problem

SEO216 needed to produce authoritative, bilingual (DE/EN) content at scale for the DACH market — but manual editorial workflows couldn't keep up with the volume demanded by modern SEO and GEO (Generative Engine Optimization). Off-the-shelf AI content tools lacked the editorial rigor, brand consistency, and audit trail required for content that ranks and converts.

### Solution

Spindle is a **Postgres-backed state machine** where each piece of content is a row walking a fixed lifecycle: `scored → decided → drafted → eval-passed → awaiting-stamp → approved → published → measured`. A task queue (Dramatiq/Redis) executes stage transitions, Claude drafts inside a brand-guide guardrail, an automated eval gate catches obvious failures, and a senior human stamps every piece before it goes live.

### Why This Stack

**Python 3.12 + SQLAlchemy 2.0 (async)** — the data model is the backbone of the system. Every signal, every transition, every piece of content is a row in Postgres. Async SQLAlchemy keeps the worker pool non-blocking under load.

**Postgres 16 + pgvector** — the single database handles both transactional data (signals, content state machine) and vector search (brand guide + past-projects RAG). No need for a separate vector database.

**Dramatiq + Redis** — simple, reliable task queue for executing FSM transitions. No heavyweight orchestrator needed. The system survives restarts because the human gate is a *row state*, not a paused workflow.

**Anthropic SDK** — Claude drafts content with prompt caching for cost efficiency. The LLM is treated as a service behind a `LLMClient` interface, making it swappable.

**FastAPI + HTMX** — the review console is intentionally lightweight. FastAPI serves the API, HTMX handles interactivity without a JavaScript framework.

### Key Features

#### 1. Pluggable Signal Sources

Every input is a `SignalSource` module that emits one normalized `Signal`. Sources include Google Search Console, Bing Webmaster Tools, Plausible, GA4, Google Business Profile, RSS feeds, DataForSEO (SERP/keywords/ranked-keywords/backlinks), competitor content, GDELT news, local events, seasonality, and more. Adding a new source means writing one file.

#### 2. Content State Machine

The FSM (`spindle.fsm`) drives each piece of content through a deterministic lifecycle. Every transition writes an immutable `review_events` row — the full editorial audit trail. Failed eval triggers a bounded re-draft instead of dropping the content.

#### 3. Brand-Guided Drafting with RAG

The RAG layer (`spindle.rag`) ingests brand guidelines, past projects, and authority signals into pgvector. Claude drafts with this context plus SERP grounding, producing DE-primary content with a faithful EN adaptation.

#### 4. Human-in-the-Loop Gates

Two editorial gates: **Gate #1** selects promising signals and assigns a content type (article, location page, comparison, how-to, FAQ, product/service, glossary). **Gate #2** is the senior editor stamp — approve, edit, or kill. Both gates are row states, not paused workflows, so the engine survives restarts.

#### 5. White-Label Audit PDFs

Spindle generates client-facing PDF audits with de-branded covers, per-page LLM content analysis, backlink summaries, and modernization opportunity flags — all rendered via WeasyPrint.

#### 6. Git-as-CMS Output

The `OutputTarget` adapter commits published content as Markdown to a central GitHub archive repo — one folder per company, one commit per publish. Vercel picks up the changes automatically.

### Architecture

```
Signal Sources (GSC, DataForSEO, RSS, GBP, GDELT, ...)
    ↓
Idea Generation → GATE #1 (editor picks topic + type)
    ↓
Decide (brief: must-haves, entities, length)
    ↓
Draft (Claude + brand guide RAG + SERP grounding)
    ↓
Eval (deterministic checks + LLM judge) → re-draft on fail
    ↓
GATE #2 (senior stamp: approve / edit / kill)
    ↓
Publish (git-as-CMS → PR → Vercel)
    ↓
Measure (GSC/Plausible signals → feedback loop)
```

### Challenges & Solutions

#### State Machine Reliability

The hardest design decision was making the human gate *non-blocking*. By encoding the gate as a row state (`awaiting-stamp`) rather than a paused worker, the system can be restarted, redeployed, or scaled without losing in-flight content. The review console polls for pending stamps.

#### Prompt Caching at Scale

Anthropic's prompt caching is essential for keeping costs sane at high volume. The brand guide prefix is cached, and the per-piece context is the variable suffix. Careful token accounting prevents surprise bills.

#### GDPR-Compliant Data Sourcing

Every signal source must be GDPR-clean. First-party sources (GSC, Plausible, GA4) are the backbone; third-party data (DataForSEO) is a metered enrichment layer. Open-web content is quarantined, sanitized, and fed to the LLM as data — never as instructions.

#### Multi-Tenant Isolation

Each client has separate signal tables, content state machines, and budget tracking. The scheduler dispatches `run_source` per source × client. The web console scopes editors to their clients.

### Screenshots

*Screenshot placeholder*

### Lessons Learned

Postgres is more capable than most people give it credit for — pgvector eliminated the need for a separate vector database, and the row-as-state-machine pattern is remarkably robust for content workflows.

The pluggable architecture paid off immediately: adding a new signal source or output target is a single file, not a configuration change. The `@source`/`@output` decorator pattern with package discovery makes registration invisible to the developer.

DACH-market content requires genuine bilingual investment — machine-translated EN content doesn't rank. Claude with prompt caching makes DE-primary + EN-adaptation cost-viable, but the prompt engineering for tone, formality, and regional specificity took significant iteration.
