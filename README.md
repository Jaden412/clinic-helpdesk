# Clinic Helpdesk

An IT ticketing system built for small medical clinics, where 2-3 in-house IT staff support the rest of the clinic's employees. Built as a class project for [your class name].

## Live Demo

[Link added after deployment]

## Overview

Small clinics often lack a formal system for reporting and tracking IT issues — problems get reported over email, Slack, or in person, with no record of what was resolved or how long it took. This app gives clinic employees a simple way to submit tickets (EMR issues, network problems, hardware, etc.) and gives IT staff a shared queue to manage, assign, and resolve them.

## Features

- **Ticket submission** — any employee can submit a ticket with a title, category, priority, and description
- **Role-based access** — two roles, Employee and IT, with different permissions enforced both in the UI and at the database level
  - Employees can submit tickets and see only their own
  - IT staff can see, sort, assign, and update the status of every ticket
- **Ticket assignment** — IT staff can assign tickets to a specific team member and track what's assigned to them personally
- **Status tracking** — Open, In Progress, Waiting on Requester, Resolved, Closed
- **Priority sorting** — sort the ticket list by priority (High to Low or Low to High)
- **Internal notes** — IT staff can leave notes on a ticket for handoffs between team members
- **Staff account management** — IT staff can create and delete other staff/employee accounts from within the app, without needing direct database access
- **Authentication** — email/password login via Supabase Auth

## Tech Stack

- **Frontend:** Next.js (React), Tailwind CSS
- **Backend / Database:** Supabase (PostgreSQL, Authentication, Row Level Security)
- **Hosting:** Vercel

## Architecture & Key Decisions

- **Database-level security (RLS):** Role checks aren't just done in the frontend — Supabase's Row Level Security policies enforce that Employees can only read/write their own tickets, and only IT staff can update ticket status or assignment, directly at the database level. This means the rules hold even if someone bypassed the UI and queried the database directly.
- **Server-side admin actions:** Creating and deleting staff accounts requires elevated (service role) permissions that must never be exposed to the browser. These actions run through Next.js API routes (`/api/create-staff`, `/api/delete-staff`) that execute only on the server.
- **Role-based UI:** Components conditionally render based on the logged-in user's role (e.g., only IT staff see the "Manage Staff" nav link or the ticket assignment dropdown).

## Database Schema

**`tickets`**
| Column | Type | Notes |
|---|---|---|
| id | int8 | Primary key |
| title | text | |
| description | text | |
| category | text | e.g. EMR, Network, Hardware |
| priority | text | Low / Medium / High / Critical |
| status | text | Default: Open |
| requester_id | uuid | References auth.users |
| assignee_id | uuid | References auth.users (IT staff only) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**`profiles`**
| Column | Type | Notes |
|---|---|---|
| id | uuid | Matches auth.users.id |
| email | text | |
| full_name | text | |
| role | text | 'IT' or 'Employee' |

**`ticket_notes`**
| Column | Type | Notes |
|---|---|---|
| id | int8 | Primary key |
| ticket_id | int8 | References tickets |
| author_id | uuid | References auth.users |
| note | text | |
| created_at | timestamptz | |

## Local Setup

1. Clone the repo and install dependencies:

npm install

2. Create a Supabase project at [supabase.com](https://supabase.com)
3. Run the SQL setup scripts (see `/sql` folder or the schema above) to create the `tickets`, `profiles`, and `ticket_notes` tables with their RLS policies
4. Create a `.env.local` file in the project root with:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_secret_key

5. Run the development server:

npm run dev

6. Visit `http://localhost:3000`

## Test Accounts

| Role | Email | Password |
|---|---|---|
| IT | devon.ashworth@clinic.com | Password123! |
| Employee | beverly.hutchins@clinic.com | Password123! |

## Future Improvements

- Email notifications when a ticket is assigned or its status changes
- File/screenshot attachments on tickets
- Filtering the ticket list by status and category, not just priority sorting
- A dedicated "requester" view showing notes as a transparent timeline