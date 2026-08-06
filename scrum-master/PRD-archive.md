The correct positioning is:

> **A gallery-first photography business website with lightweight client delivery and customer workflow management.**

The gallery engine is the IP. The business tools exist to make the photographer's life easier. The platform is not trying to become a permanent photo storage platform.

The client relationship is:

```text
Visitor
   ↓
Lead
   ↓
Booking
   ↓
Contract
   ↓
Payment
   ↓
Photo Session
   ↓
Gallery Delivery Window
   ↓
Download Completed
   ↓
Archive
```

The client does not live inside the platform.

---

Note from Operator: 
Here is your template:
/Users/asim/NoIcloud/earthandhoney/public/photobuddy

The end product website should look exactly like this. dont consider this a constraint. consider all the creativity already done for you. the picture should be replaced by our gallery concept.

You can also use it to find images., it has images add different dimensions in its repo. so you can make use of them.


# Product Requirements Document (PRD)

# Gallery-First Photography Business Platform

## 1. Product Vision

Build a lightweight, high-performance photography business website powered by a reusable **Gallery Engine**.

The platform enables photographers to:

* showcase photography professionally
* convert website visitors into leads
* publish photography stories
* manage customer workflows
* deliver client galleries temporarily
* simplify contracts and payments

The product's competitive advantage is the **Gallery Engine**:

* extremely fast
* visually premium
* mobile-first
* reusable across the entire website
* easy to manage through CMS

---

# 2. Core Product Principle

## The Gallery is the primary content object.

Images are not the primary content unit.

A photographer does not think:

> "Upload image 42."

They think:

> "Create a wedding gallery."

Everything photography-related is built around galleries.

Examples:

```
Homepage Hero
      ↓
   Gallery


Portfolio
      ↓
   Gallery


Blog Article
      ↓
   Gallery


Client Delivery
      ↓
   Gallery
```

No separate image systems should exist.

---

# 3. Technology Stack

## Frontend

* Next.js App Router
* TypeScript
* React Server Components

## Styling

* Tailwind CSS
* shadcn/ui

## CMS

Payload CMS

## Database

PostgreSQL

## Storage

Cloudflare R2

## Image Processing

Sharp

## Gallery Viewer

PhotoSwipe

## Authentication

Better Auth

## Email

Resend

## Payments

Stripe Checkout

## Billing Management

Invoice Ninja

## Contracts

Adobe Acrobat Sign

---

# 4. System Architecture

```
Next.js Application

├── Public Website

├── Photographer Dashboard

├── Client Delivery Pages

└── Integrations

        ├── Payload CMS
        ├── Cloudflare R2
        ├── Stripe
        ├── Invoice Ninja
        └── Adobe Sign
```

---

# 5. Gallery Engine (Core IP)

The Gallery Engine is the first component built.

The development team must build the gallery engine before building website pages.

---

# 5.1 Gallery Data Model

A gallery is an independent reusable object.

Example:

```
Gallery

ID

Title

Description

Images[]

Cover Image

Settings
```

A gallery contains ordered images.

Example:

```
Wedding at Niagara Falls

    Image 01

    Image 02

    Image 03
```

---

# 5.2 Media System

Images exist as reusable media assets.

Media contains:

```
Original File

Thumbnail

Medium

Large

Metadata

Alt Text
```

Images are stored in:

```
Cloudflare R2
```

Payload stores relationships and metadata.

---

# 5.3 Gallery Component Architecture

The gallery engine consists of reusable components.

```
Gallery Engine

├── Gallery Container

├── Main Image Display

├── Thumbnail Preview

├── Fullscreen Viewer

├── Navigation Controls

├── Mobile Gallery Drawer

└── Slideshow Controller
```

---

# 5.4 Gallery Visual Requirements

Every gallery display must include:

## Subtle Black Gradient Overlay

Purpose:

* improve readability
* create premium aesthetic
* maintain visual consistency

Implementation:

* CSS overlay
* lightweight
* no image processing

---

# 5.5 Mobile-First Requirement

The gallery must be designed mobile-first.

Requirements:

* touch navigation
* swipe gestures
* responsive images
* fast loading
* optimized controls

Desktop enhancements:

* hover previews
* mouse navigation

---

# 5.6 Gallery Display Modes

The same engine powers different experiences.

---

## Hero Gallery

Purpose:

Homepage impact.

Settings:

```
slideshow:
enabled

hover preview:
disabled

fullscreen:
disabled
```

Example:

Homepage rotating photography showcase.

---

## Portfolio Gallery

Purpose:

Show photographer's work.

Settings:

```
hover preview:
enabled

fullscreen:
enabled
```

---

## Blog Gallery

Purpose:

Photography storytelling.

A blog does not have a featured image.

A blog has a gallery.

Example:

```
Blog:

"Sarah and John's Wedding"


Content


Gallery:

45 Wedding Photos
```

---

## Client Delivery Gallery

Purpose:

Temporary client photo delivery.

Settings:

```
download:
enabled

fullscreen:
enabled

authentication:
required
```

---

# 5.7 Gallery Hover Experience

Desktop:

```
Hover Gallery

↓

Thumbnail strip appears

↓

User previews gallery images
```

Example:

```
--------------------------------

Wedding Story


     Main Image


Hover:

[1][2][3][4][5]


--------------------------------
```

---

Mobile:

No hover.

Instead:

```
Tap Gallery

↓

Thumbnail drawer opens
```

---

# 5.8 Fullscreen Viewer

Clicking any image opens fullscreen.

Requirements:

* next image
* previous image
* close
* swipe
* keyboard navigation

Powered by PhotoSwipe.

---

# 6. Performance Requirements

Performance is a core feature.

The gallery must feel instant.

---

## Image Pipeline

Upload:

```
Original Image

↓

Sharp Processing

↓

Thumbnail

Medium

Large

Original
```

---

## Rendering

Use:

* Next.js Image
* responsive images
* lazy loading
* progressive loading

---

## Initial Load

Never load the entire gallery.

Only load:

* visible images
* required thumbnails

---

## Caching

Public pages should use:

* static generation
* incremental regeneration

Payload updates should trigger page refresh.

---

# 7. Payload CMS Scope

Payload is the photographer's content management system.

The photographer should not need developer assistance to update the website.

---

# Collections

## Media

Manage images.

---

## Galleries

Create and manage:

* portfolio galleries
* hero galleries
* blog galleries

Functions:

* upload images
* reorder images
* remove images
* select cover image

---

## Portfolio

Portfolio pages reference galleries.

Example:

```
Wedding Portfolio

    Niagara Wedding Gallery

    Dubai Wedding Gallery
```

---

## Blog

Full publishing system.

Fields:

```
Title

Slug

Content

Gallery

SEO

Publish Date

Status
```

---

Rules:

* Blog posts use galleries, not featured images.
* No `<em>` tags anywhere in blog content.
* Two complete sample blog posts must be created.

---

## Homepage Content

Manage:

* hero gallery
* text
* CTA
* sections

---

## Testimonials

---

## Packages

---

## FAQ

---

# 8. Public Website

Purpose:

Convert visitors into photography enquiries.

The website is not primarily a gallery viewer.

The goal is lead generation.

---

Pages:

```
Home

Portfolio

Blog

Packages

About

Contact
```

---

# 9. Lead Generation

The contact form is a core business feature.

Required fields:

```
Name

Email OR Phone

Photography Type

Preferred Date

Message
```

Every submission creates a lead.

---

# WhatsApp Workflow

The WhatsApp button is a lead capture mechanism.

Flow:

```
User clicks WhatsApp

↓

Form appears

↓

User enters contact details

↓

Lead saved

↓

WhatsApp opens with pre-filled message
```

No anonymous WhatsApp conversations.

---

# 10. Photographer Dashboard

A lightweight operational dashboard.

The dashboard is not a full CRM.

It helps the photographer manage customers.

---

## Leads

View:

* enquiries
* contact information
* status

---

## Clients

View:

* contact details
* sessions
* contracts
* payments
* galleries

---

## Sessions

Central business object.

Contains:

```
Client

Date

Location

Package

Notes
```

Links:

```
Session

↓

Contract

↓

Payment

↓

Gallery
```

---

# 11. Contracts

Adobe Acrobat Sign integration.

Workflow:

```
Send Contract

↓

Client signs

↓

Webhook

↓

Status updated

↓

Signed PDF stored
```

---

# 12. Payments

Invoice Ninja handles:

* invoices
* receipts
* balances

Stripe handles:

* checkout
* payment processing

The application displays payment status.

It does not recreate billing logic.

---

# 13. Client Gallery Delivery

The platform is not permanent photo storage.

Purpose:

Deliver completed work.

Workflow:

```
Photographer uploads gallery

↓

Client receives link

↓

Client views photos

↓

Client downloads photos

↓

Gallery archived
```

---

Gallery controls:

* private link
* password protection
* download enabled
* expiration window

---

# 14. Future Enhancements

Not initial scope:

* print store
* ecommerce
* Lightroom integration
* mobile application
* advanced proofing
* AI tagging
* multi-photographer accounts

---

# Final Product Definition

This product is:

**A premium photography website powered by a world-class lightweight Gallery Engine, combined with simple business workflow tools.**

The priorities are:

1. Gallery speed
2. Image quality
3. Mobile experience
4. CMS simplicity
5. Lead conversion
6. Customer workflow management

The platform should not attempt to become a permanent photo hosting service.

The photographer owns the galleries.

The platform helps them present, sell, organize, and deliver their work efficiently.
