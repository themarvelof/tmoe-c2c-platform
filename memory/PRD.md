# TMOE C2C Platform - Product Requirements Document

## Original Problem Statement
Build a Content 2 Commerce (C2C) Framework App for TMOE. The platform connects Brands, Publishers, and an Admin to manage commerce-linked content campaigns. Features include role-based dashboards, campaign management, content tracking (RSS/crawled articles), and reporting.

## Tech Stack
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (Motor async driver)
- **Auth**: JWT-based authentication
- **Design**: marvelof.com color scheme (Black #000000, White #FFFFFF, Red #DC120F)

## User Roles
1. **Admin** (admin@tmoe.com) - Full platform management, brand creation, campaign management, directory
2. **Brand** (e.g., amazontmoe@marvelof.com) - View publishers, content tracking, reporting
3. **Publisher** (e.g., abhishek@marvelof.com) - View assigned brands, campaigns, content management

## Implemented Features (Complete)
- [x] Full-stack setup (React + FastAPI + MongoDB)
- [x] JWT authentication with role-based access (Admin, Brand, Publisher)
- [x] Admin: Directory, manual brand creation, campaign management with edit & publisher assignment
- [x] Publisher: Unique IDs, "My Brands" view, dashboard
- [x] Brand: "My Publishers" view, content tracking with articles grouped by published date
- [x] Campaign Management: Create, edit, assign publishers via dropdown
- [x] Content tracking: Crawled marvelof.com Amazon articles, seeded for amazontmoe@marvelof.com
- [x] Visual date segregation: Articles grouped by date with section headers and article counts
- [x] marvelof.com design system applied (Black/White/Red with rounded corners)
- [x] Brand reporting webhook endpoint

## Key API Endpoints
- `POST /api/auth/register` & `POST /api/auth/login`
- `GET /api/campaigns` & `PUT /api/campaigns/{id}/assign`
- `GET /api/brand/my-publishers`
- `GET /api/brand/publishers/{publisher_id}/content` (sorted by date, descending)
- `POST /api/content-pieces`
- `POST /api/webhooks/reports`
- `POST /api/seed-admin`

## Database Collections
- `users`: {id, email, password_hash, role, status, company_name, website}
- `campaigns`: {id, name, category, assigned_brand, assigned_publishers[], status, budgets}
- `content_pieces`: {id, title, url, publisher_id, brand_id, published_date, image_url, source, author}
- `roi_benchmarks`: {category, cvr, aov, traffic_multiplier, ctr}

## Upcoming Tasks (P1)
- RSS Feed Automation: Replace manual crawl/seed with dynamic RSS parsing
- Email Notifications: Currently MOCKED, needs real implementation
- Distribution Partner API: Real-time brand reporting (currently MOCKED via webhook)

## Future/Backlog (P2)
- Backend refactoring: Split server.py (~1135 lines) into route modules
- Publisher profile management with logo uploads
- Advanced analytics and reporting dashboards
- Multi-brand campaign support
