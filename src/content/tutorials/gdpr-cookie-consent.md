---
title: GDPR-Compliant Cookie Consent with Google Consent Mode v2
description: How to implement a full GDPR cookie consent system with Google Consent Mode v2 in Astro, including banner, settings modal, and localStorage persistence.
tags:
  - GDPR
  - Privacy
  - Google Analytics
  - JavaScript
order: 1
---

German websites must comply with DSGVO (GDPR). This means explicit consent before loading analytics or ad scripts. Here's how I implemented it for the Attar Dienstleistungen website.

## The Architecture

1. **Initial state**: All Google services are denied by default (`denied` for `analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization`)
2. **Banner**: Shows immediately, offering Accept All / Reject All / Customize
3. **Settings modal**: Individual toggles for Analytics (GA4) and Marketing (Google Ads)
4. **Consent update**: When the user makes a choice, `gtag('consent', 'update', ...)` fires immediately
5. **Persistence**: Consent stored in `localStorage` with a version number

## Code Structure

```astro
<script>
  // Default consent (denied until action)
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500,
  });

  function acceptAll() {
    gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    });
    localStorage.setItem('cookie-consent', JSON.stringify({
      analytics: true, marketing: true, version: 1
    }));
  }
</script>
```

## The Settings Modal

The modal has separate toggles for Analytics and Marketing, so users can choose precisely what they consent to:

```astro
<div class="consent-modal" role="dialog" aria-modal="true">
  <h3>Cookie-Einstellungen</h3>
  <label>
    <input type="checkbox" id="consent-analytics" />
    Analytics (Google Analytics)
  </label>
  <label>
    <input type="checkbox" id="consent-marketing" />
    Marketing (Google Ads)
  </label>
  <button onclick="saveConsent()">Speichern</button>
</div>
```

## What I Learned

The tricky part was timing — Google Tag Manager loads asynchronously, so the consent default needs to be set **before** GTM loads. I placed the consent snippet in the `<head>` as a blocking script, with `wait_for_update: 500` to handle race conditions.

Another gotcha: the `localStorage` entry needs a version number. When you update your consent logic (e.g., adding a new cookie), increment the version to re-prompt returning users.
