---
title: How Signal Sources Improve LLM Writing Quality
description: Why grounding LLM output in real-world data beats zero-shot generation — a look at pluggable signal sources, the normalized Signal pattern, and how first-party data makes content rank.
tags:
  - LLM
  - Architecture
  - SEO
  - Data
order: 5
---

An LLM left to generate content from its training data alone produces generic, hallucination-prone fluff. The difference between mediocre AI content and content that actually ranks is the **signals** you feed into the drafting process.

This tutorial breaks down how Spindle uses pluggable signal sources to ground every piece of content in real-world data — search trends, competitor gaps, seasonal patterns, and verified first-party metrics.

## The Problem with Zero-Shot Generation

If you prompt Claude with "write an article about local SEO for plumbers in Munich," you get:

- Generic advice that applies to any city anywhere
- Plausible-sounding but unverifiable statistics
- No awareness of what competitors are doing
- No connection to actual search demand

The result is content that might read well but won't rank, because it's not answering the questions people are actually searching for.

## The Signal Pattern

The solution is a normalized `Signal` — a common currency that every input module emits, regardless of its source:

```python
class Signal(BaseModel):
    id: str
    source: str           # which module emitted it
    kind: SignalKind      # NEWS, KEYWORD, COMPETITOR, SEASONALITY, ...
    client_id: str | None
    title: str | None
    body: str | None
    entities: list[str]   # topics, keywords, locations
    metrics: dict[str, float]  # position, CTR, volume, CPC
    trust: float          # 0..1 source weight
    provenance: Provenance     # where it came from, what it cost
```

Every source — Google Search Console, DataForSEO, RSS feeds, Google Business Profile, competitor monitoring — implements a `SignalSource` interface and returns `Signal` objects. The rest of the engine never sees source-specific shapes.

```python
class SignalSource(ABC):
    slug: ClassVar[str]
    kind: ClassVar[SignalKind]

    @abstractmethod
    async def fetch(self, ctx: FetchContext) -> FetchResult:
        """Pull new data and normalize it."""

    @abstractmethod
    def normalize(self, raw: dict, ctx: FetchContext) -> Signal:
        """Turn one source-native record into a Signal."""
```

## How Signals Feed the LLM

### 1. Grounding the Brief (What to Write)

Before a single token is generated, the ideation stage assembles a ranked list of topic proposals from every available signal source:

- **GSC striking-distance keywords**: queries ranking at positions 5–20 where a small content push can win traffic
- **DataForSEO keyword data**: search volume, CPC, intent classification, seasonality
- **Competitor content gaps**: topics your competitors cover that you don't
- **AI citation gaps**: prompts where a rival is cited by AI assistants and you aren't
- **Fresh signals**: recent news, social mentions, local events, seasonal trends

The LLM advisor sees all of this as structured context and ranks ~5 proposals. A human picks one (or the system autopicks if configured). The chosen proposal becomes the **brief** — a structured document with must-haves, target entities, length, and content type.

### 2. Grounding the Draft (How to Write It)

When drafting, the engine assembles context from three signal categories:

**Brand context** — ingested from brand guides and past projects via RAG (pgvector):

```python
brand_context = await retrieve(
    session, brand_guide_id, brief.keywords, top_k=5
)
```

This ensures the LLM writes in the brand's voice, references the company's actual services, and links to existing published pages.

**Grounding context** — SERP data from DataForSEO, entity lists from GSC, internal links from the client's existing content:

```python
class GroundingContext(BaseModel):
    serp_entities: list[str]       # what competitors rank for
    keywords: list[KeywordIntel]   # volume, intent, position
    internal_links: list[dict]     # own published pages for linking
    competitor_pages: list[str]    # what the competition says
```

**Signal-fed metadata** — the LLM receives structured data about what to emphasize:

```python
brief = Brief(
    primary_entity="Reinigungsservice Kirn",
    target_keywords=["Reinigungsservice Kirn", "Hausreinigung Kirn"],
    target_intent="commercial",
    must_cover=["service area", "pricing", "certifications"],
    entities=["Adam Attar", "Kirn", "Rheinland-Pfalz", "DSGVO"],
)
```

### 3. Signal Quality by Source Type

Not all signals are equal. Each source has a `trust` score and a `SourcedFrom` classification:

| Source | Trust | Cost | Quality |
|---|---|---|---|
| GSC (first-party) | High | Free | Actual search queries your site ranks for |
| Google Business Profile | High | Free | Verified business data and reviews |
| Plausible / GA4 | High | Free | Actual user behavior on your site |
| DataForSEO | Medium | Metered | Enriched keyword/SERP data |
| RSS / Competitor content | Low | Free | Open-web content, must be sanitized |

Open-web content (RSS, competitor scraping, social media) is flagged as `untrusted` and fed to the LLM as **data, not instructions**:

```python
# Untrusted content is delimited and labeled
content = wrap_untrusted(raw_html, source="competitor_content")
# The LLM sees: [UNTRUSTED SOURCE — competitor_x.com/about]
# But cannot treat it as an instruction
```

### 4. The Dedupe Problem

Without deduplication, the same signal would be drafted multiple times. Each signal gets a deterministic stable ID:

```python
def stable_id(source: str, native_id: str) -> str:
    return sha256(f"{source}:{native_id}".encode()).hexdigest()
```

The core runner checks this ID before inserting into the database. Same source + same native ID = no-op. This is especially important for RSS feeds and ranked keywords that are fetched on a schedule.

## Real Example: From Signal to Published Content

Here's how signals flow into a single piece of content for a local service business:

```
1. GSC fetch → signal: query "Reinigungsservice Kirn" at position 9
2. DataForSEO → signal: volume 320/mo, intent "commercial"
3. Competitor monitor → signal: competitor_x published "Reinigungsservice Kirn: Preise 2025"
4. Seasonality → signal: spring cleaning demand peaks in March-April
5. Brand guide RAG → signal: company offers 10% first-time discount, certified by IHK
```

The ideation advisor sees all five signals and proposes "Reinigungsservice Kirn: Preise & Leistungen 2025 — inklusive Frühjahrsangebot." The brief incorporates the competitor angle (pricing page), the seasonal hook (spring offer), and the brand differentiator (IHK certification, 10% discount).

The draft is grounded in actual search queries, actual competitor content, and actual brand assets. When it publishes, it has a realistic shot at position 1 — not because the LLM wrote well, but because it wrote about exactly what searchers are looking for.

## Key Takeaways

- **Zero-shot LLM content is generic** — it lacks the specificity that search engines reward
- **Signals bridge the gap** between what the LLM knows and what the market needs
- **First-party data (GSC, GBP, analytics)** is the highest-quality signal source — it's free, trusted, and specific to your client
- **Enrichment layers (DataForSEO)** add demand context but shouldn't be the only input
- **Open-web content is useful but dangerous** — always sanitize and treat as data, not instructions
- **The Signal abstraction** lets you add new sources without changing the drafting pipeline
