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
- [x] Brand: "My Publishers" view showing publisher name "Marvel of Everything" with logo
- [x] Content tracking: 9 Amazon articles from marvelof.com, grouped by published date with section headers
- [x] Data persistence: Startup seed ensures all users, profiles, campaigns, articles, and reports exist on server start
- [x] Publisher profile with name, logo, website, RSS feed URL
- [x] Campaign Management: Create, edit, assign publishers via dropdown
- [x] marvelof.com design system applied (Black/White/Red with rounded corners)
- [x] Brand reporting webhook endpoint
- [x] **Reports Dashboard (Brand)**: Drag-drop upload (CSV, XLS, XLSX), unique report email per brand, auto-generated charts from numeric columns, dynamic column/row rendering, summary metrics bar
- [x] **Reports Dashboard (Publisher)**: Brand reports grouped by brand, expandable with auto-charts + data tables
- [x] **Reports Dashboard (Admin)**: All brand reports overview, Upload per brand (CSV/XLS/XLSX), expandable with auto-charts + data tables
- [x] **Dynamic CSV/XLS Reports**: Any file uploaded renders every column and row + auto-generates a Performance Overview bar chart from numeric columns

## Key API Endpoints
- `POST /api/auth/register` & `POST /api/auth/login`
- `GET /api/campaigns` & `PUT /api/campaigns/{id}/assign`
- `GET /api/brand/my-publishers` — returns publishers with profile name, logo, content count
- `GET /api/brand/publishers/{publisher_id}/content` — returns articles sorted by date desc
- `POST /api/content-pieces`
- `POST /api/webhooks/reports`
- `POST /api/seed-admin`
- `POST /api/brand/reports/upload-csv` — upload CSV report file with campaign performance data
- `GET /api/brand/reports` — list all brand reports (filterable by period, date range)
- `GET /api/brand/reports/summary` — aggregated summary of all metrics
- `DELETE /api/brand/reports` — clear all reports for brand
- `DELETE /api/brand/reports/{id}` — delete specific report

## Database Collections
- `users`: {id, email, password_hash, role, status, company_name, website}
- `campaigns`: {id, name, category, assigned_brand, assigned_publishers[], status, budgets}
- `content_pieces`: {id, title, url, publisher_id, brand_id, published_date, image_url, source, author}
- `publisher_profiles`: {id, user_id, name, website, logo_url, categories, rss_feed_url}
- `roi_benchmarks`: {category, cvr, aov, traffic_multiplier, ctr}

## Upcoming Tasks (P1)
- RSS Feed Automation: Replace manual crawl/seed with dynamic RSS parsing
- SendGrid Inbound Parse: Configure real email receiving for CSV reports (needs domain DNS/MX records)
- Email Notifications: Currently MOCKED, needs real SendGrid integration for sending

## Future/Backlog (P2)
- Backend refactoring: Split server.py (~1400 lines) into route modules
- Advanced analytics and reporting dashboards
- Multi-brand campaign support
- Automated daily report email digests
