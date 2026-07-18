---
title: Schema.org Structured Data for Local Businesses
description: How to implement JSON-LD structured data for local businesses to improve SEO and get rich search results.
tags:
  - SEO
  - Schema.org
  - JSON-LD
order: 3
---

SEO for local service businesses requires specific structured data. Here's the pattern I used for the Attar Dienstleistungen website.

## LocalBusiness + Service

```astro
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Attar Dienstleistungen",
  "description": "Reinigungsservice, Hausmeisterservice, Umzugsservice und Gartenservice",
  "url": "https://attar-dienstleistungen.de",
  "telephone": "+49 176 55235870",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Nachtigallenweg 10",
    "addressLocality": "Kirn",
    "postalCode": "55606",
    "addressCountry": "DE"
  },
  "areaServed": ["Kirn", "Bad Kreuznach", "Idar-Oberstein"]
}
</script>
```

## BreadcrumbList

Each service page has breadcrumb structured data for rich search results:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Startseite",
      "item": "https://attar-dienstleistungen.de"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Reinigungsservice",
      "item": "https://attar-dienstleistungen.de/dienstleistungen/reinigungsservice"
    }
  ]
}
```

## Service-Specific Schema

Each service detail page also includes a `Service` type:

```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Reinigungsservice",
  "provider": {
    "@type": "LocalBusiness",
    "name": "Attar Dienstleistungen"
  },
  "areaServed": ["Kirn", "Bad Kreuznach"],
  "description": "Professionelle Reinigungsdienstleistungen für Privat und Gewerbe"
}
```

## FAQPage

Service pages with FAQ sections use the `FAQPage` schema, which can generate rich results with expandable Q&As in Google search:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Wie schnell kann ein Umzug organisiert werden?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "In der Regel innerhalb von 3-5 Werktagen."
      }
    }
  ]
}
```

## Why This Matters

Rich search results can show star ratings, service areas, and contact buttons directly in Google SERP. For a local service business, this is the difference between being page 3 of Google and being in the "Local Pack" (the map + 3 businesses shown at the top).

The structured data also helps Google understand your site hierarchy, which improves crawl efficiency and can lead to better rankings across all your pages.
