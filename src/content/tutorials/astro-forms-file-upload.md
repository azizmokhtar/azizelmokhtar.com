---
title: Building Server-Side Forms with File Upload in Astro
description: How to build contact forms and job application forms with file upload in Astro using API routes and Nodemailer.
tags:
  - Astro
  - Nodemailer
  - Forms
  - TypeScript
order: 2
---

Astro's API routes make server-side form handling clean and simple. Here's how I built contact and job application forms for the Attar Dienstleistungen website.

## The Contact Form Endpoint

```ts
// src/pages/api/contact.ts
import type { APIRoute } from "astro";
import nodemailer from "nodemailer";

export const POST: APIRoute = async ({ request }) => {
  const data = await request.formData();
  const name = data.get("name")?.toString().trim();
  const email = data.get("email")?.toString().trim();
  const honeypot = data.get("website")?.toString();

  // Honeypot check
  if (honeypot) {
    return new Response(null, { status: 204 });
  }

  // Validation
  if (!name || !email || !email.includes("@")) {
    return new Response(JSON.stringify({ error: "Invalid input" }), {
      status: 400,
    });
  }

  // Send email via Gmail SMTP
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: import.meta.env.GMAIL_USER,
      pass: import.meta.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: import.meta.env.GMAIL_USER,
    to: "attar.dienstleistungen@gmail.com",
    subject: `Neue Kontaktanfrage von ${name}`,
    html: `<p>Name: ${name}</p><p>Email: ${email}</p>`,
  });

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
```

## The Application Form (with File Upload)

For the job application form, I needed `multipart/form-data` to handle the CV upload:

```ts
export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const cv = formData.get("cv") as File | null;

  if (cv) {
    // Validate file type
    const allowed = ["application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(cv.type)) {
      return new Response(JSON.stringify({ error: "Invalid file type" }), {
        status: 400,
      });
    }

    // Validate size (5MB)
    if (cv.size > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File too large" }), {
        status: 400,
      });
    }

    // Sanitize filename
    const safeName = cv.name.replace(/[^a-zA-Z0-9._-]/g, "_");

    // Send as email attachment
    const buffer = Buffer.from(await cv.arrayBuffer());
    // ... attach to email
  }
};
```

## Security Considerations

- **Honeypot fields**: Hidden form fields that bots fill but humans don't
- **File type validation**: Check MIME types server-side, not just in the browser
- **File size limits**: Enforce at both client and server level
- **Filename sanitization**: Remove special characters to prevent path traversal
- **Rate limiting**: Consider adding rate limits to prevent abuse
- **Environment variables**: Store SMTP credentials in `.env.local`, never commit them

## The Auto-Reply Pattern

For the contact form, I send two emails: one notification to the company and one confirmation to the customer. This is a nice touch that builds trust.

```ts
// Internal notification
await transporter.sendMail({ ... });

// Customer auto-reply
await transporter.sendMail({
  from: import.meta.env.GMAIL_USER,
  to: customerEmail,
  subject: "Wir haben Ihre Anfrage erhalten",
  html: `<p>Hallo ${name},</p><p>wir haben Ihre Nachricht erhalten und melden uns innerhalb von 24 Stunden.</p>`,
});
```
