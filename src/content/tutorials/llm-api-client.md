---
title: Building a Reliable LLM API Client
description: How to structure an LLM client for production — model tiering, prompt caching, cost gates, retries, and the protocol pattern that keeps the provider swappable.
tags:
  - LLM
  - Python
  - API
  - Architecture
order: 4
---

When you're building an engine that depends on an LLM for every content draft, the client code needs to be more than a simple API wrapper. It needs cost controls, graceful degradation, retry logic, and a clean interface so the rest of the system never imports an SDK directly.

This tutorial breaks down the production LLM client pattern I built for Spindle, an AI content engine that uses Claude (and optionally Gemini) to draft, evaluate, and refine content at scale.

## The Protocol Pattern

The core rule: **the engine never imports the Anthropic SDK.** The LLM client is defined as a Python `Protocol`, so any provider implementation can be swapped in without touching a single consumer.

```python
@runtime_checkable
class LLMClient(Protocol):
    async def complete(self, request: LLMRequest) -> LLMResponse: ...
```

The `LLMRequest` carries everything the call needs — messages, system prompt, model tier, purpose, max tokens, temperature — in a Pydantic model:

```python
class LLMRequest(BaseModel):
    messages: list[LLMMessage]
    system: str | None = None
    tier: ModelTier = ModelTier.STANDARD
    purpose: Purpose = Purpose.UTILITY
    max_tokens: int = 4096
    temperature: float = 0.4
    cache_system: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)
```

Why this matters:

- **You can mock the client in tests** without hitting an API
- **Switching providers** (Anthropic → Gemini → OpenAI) is a single file change, not a refactor
- **Cross-cutting concerns** (cost tracking, metrics, retries) live in one place instead of scattered across every call site

## Model Tiering

Not every LLM call needs the same quality. Scoring a signal topic can use a fast, cheap model; drafting a publishable article needs the best available. Tiering routes each request to the appropriate model:

```python
class ModelTier(StrEnum):
    CHEAP = "cheap"     # score / decide / dedupe → Haiku
    STANDARD = "standard"  # default drafting     → Sonnet
    PREMIUM = "premium"  # high-value drafting     → Opus
```

Each tier maps to a concrete model ID with known pricing and capabilities:

```python
def anthropic_spec(tier: ModelTier, override: str | None = None) -> ModelSpec:
    model_id = override or {
        ModelTier.CHEAP: "claude-3-5-haiku-latest",
        ModelTier.STANDARD: "claude-sonnet-4-20250514",
        ModelTier.PREMIUM: "claude-opus-4-20250514",
    }[tier]
    # ... return spec with pricing, temperature support, thinking config
```

This lets you **control cost at the call site** without any branching logic:

- Utility calls (score, evaluate, judge) → `CHEAP`
- Standard drafting → `STANDARD`
- Complex or high-value content → `PREMIUM`

## Cost Gate: Fail Before You Spend

A runaway loop or misconfigured source could burn through your API budget in minutes. The cost gate checks the budget *before* every call:

```python
est_usd = estimate_cost(spec, estimate_input_tokens(request), request.max_tokens)
if not await self._cost_gate.can_spend("anthropic", Cost(usd=est_usd)):
    raise LLMBudgetExceeded("daily LLM budget exhausted")
```

The estimate is deliberately **conservative** — it assumes every input token is full price (ignoring cache discounts) and every output token is at the ceiling. This means it might reject a call that would have succeeded, but it will never let a call through that exceeds the budget.

After the call completes, actual usage is recorded:

```python
await self._cost_gate.record(
    "anthropic", spec.model_id, Cost(usd=usage.cost_usd),
    content_id=meta.get("content_id"),
    client_id=meta.get("client_id"),
)
```

## Prompt Caching

Anthropic supports prompt caching where a stable prefix (the brand guide, system instructions) is cached and reused across calls. This dramatically reduces cost and latency.

```python
if request.cache_system:
    kwargs["system"] = [{
        "type": "text",
        "text": request.system,
        "cache_control": {"type": "ephemeral"},
    }]
```

The key insight: **cache the stable part, vary the dynamic part.** The brand guide and system instructions are cached; the per-article context (SERP data, brief) is the variable suffix. Token accounting tracks cache hits separately:

```python
usage = LLMUsage(
    input_tokens=resp.usage.input_tokens,
    output_tokens=resp.usage.output_tokens,
    cache_read_tokens=resp.usage.cache_read_input_tokens,
    cache_write_tokens=resp.usage.cache_creation_input_tokens,
)
```

## Retries and Timeouts

The SDK default timeout is 600 seconds — that's an eternity when a worker queue is waiting. Cap each attempt and let the SDK's built-in retry handle transient failures:

```python
self._client = AsyncAnthropic(
    api_key=key,
    timeout=120.0,    # per-attempt ceiling
    max_retries=3,     # Retry-After aware, handles 408/409/429/5xx
)
```

Three attempts at 120 seconds plus backoff stays well under the worker's total time budget.

## Observability

Every call is instrumented with structured metrics:

```python
metrics.LLM_TOKENS.labels(model=spec.model_id, kind="input").inc(usage.input_tokens)
metrics.LLM_TOKENS.labels(model=spec.model_id, kind="output").inc(usage.output_tokens)
metrics.LLM_COST_USD.labels(model=spec.model_id).inc(usage.cost_usd)
```

And tracing captures per-call context:

```python
s["input_tokens"] = usage.input_tokens
s["output_tokens"] = usage.output_tokens
s["cost_usd"] = round(usage.cost_usd, 6)
```

This makes it trivial to answer questions like "how much did we spend on Sonnet vs Opus this week?" or "which content type consumes the most tokens?"

## Provider Caching

The client factory caches instances so the Gemini provider's cache registry persists across calls:

```python
@lru_cache
def get_llm_client_for(provider, model):
    if provider == "gemini":
        return GeminiClient(cost_gate=CostGate(), model_override=model)
    return AnthropicClient(cost_gate=CostGate(), model_override=model)
```

## Putting It Together

The full flow for a single LLM call:

1. **Gate**: estimate cost, check budget → reject early if over
2. **Select**: pick model by tier (+ optional override per client)
3. **Prepare**: apply prompt caching to stable system block
4. **Execute**: send with timeout + retries
5. **Account**: record actual cost, emit metrics, log usage
6. **Return**: structured response (text, model, usage, stop reason)

The caller never sees any of this — it just awaits `client.complete(request)` and gets back a `LLMResponse`.

## Key Takeaways

- Define the LLM client as a `Protocol` so the rest of the system is provider-agnostic
- Use model tiering to match cost to task quality requirements
- Gate API calls *before* they execute with a conservative cost estimate
- Prompt caching is essential for cost-viable content generation at scale
- Instrument every call — you can't optimize what you don't measure
