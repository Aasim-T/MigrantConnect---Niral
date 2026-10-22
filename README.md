# MigrantConnect (Niral)

An Aadhaar-verified platform for **migrant workers in Tamil Nadu** and the employers who hire them. In one place it covers jobs, hiring, wage records both sides can see, grievance redressal, and welfare-scheme eligibility.

---

## The problem

Tamil Nadu employs lakhs of inter-state migrant workers in construction, textiles and manufacturing. Most are informal and invisible to the system:

- **No identity trail.** Workers move between sites and states with no verified record of their skills or work history.
- **Middlemen control jobs.** Contractors take commissions, and workers can't find jobs that match their skills directly.
- **Wage theft and delays.** Wages are paid in cash with no record. A worker who is underpaid has no proof.
- **Grievances go nowhere.** Complaints about safety, hours or harassment have no tracked channel, and workers fear retaliation.
- **Welfare goes unclaimed.** Workers don't know which schemes (e-Shram, PM-SYM, the TN Construction Workers Welfare Board and others) they qualify for.

## What MigrantConnect solves

| Problem | Feature |
|---|---|
| Identity | Registration and login with **Aadhaar (Verhoeff checksum) + OTP**. Employers use a GSTIN. Each worker gets a portable **Worker ID (MIG-xxxxx)** with skills and history |
| Finding work | Job search with filters. **Skill-matched recommendations**. Matching workers are notified the moment a job is posted |
| Hiring | Employers post jobs and review applicants (shortlist → interview → **hire at a daily wage**) |
| Wage transparency | The employer logs days worked. The worker sees **every entry, due date and payment** (method + UTR). Overdue wages are flagged on both dashboards |
| Grievance redressal | The worker files a grievance (wage, safety, hours, harassment…). It becomes a **threaded case** the employer must answer and resolve, and the worker confirms or reopens it. **Paying a disputed wage entry auto-resolves the dispute** |
| Welfare | 8 central and TN schemes, **eligibility computed from the profile** (age, income, bank account, occupation). Apply with documents uploaded and get a reference number |
| Staying informed | Notifications for every state change, with unread badges |

---

## Run it

```bash
pnpm install        # or: npm install --legacy-peer-deps
pnpm dev            # http://localhost:3000
```

Nothing else is required. Data lives in `.data/db.json` and is seeded on first run.
- Reset the demo by stopping the server, running `pnpm db:reset`, then starting it again. Or call `curl -X POST localhost:3000/api/dev/reset` while it runs.
- Optional settings are listed in `.env.example`: demo mode, an SMS-gateway webhook for OTPs, and the data-file path.

**Demo accounts** (demo mode shows the OTP on screen):

| Role | Login with | OTP |
|---|---|---|
| Worker: Vishaal Maria Anto (MIG-10001) | Aadhaar `1234 1234 1234` | `1234` or the code shown |
| Employer: ABC Construction (EMP-5001) | GSTIN `33AABCA1234F1ZG` (or Aadhaar `1234 1234 1234` on the Employer tab) | shown on screen |
| Employer: Metro Projects (EMP-5002) | GSTIN `33AAFCM5678K1Z1` | shown on screen |

To register a new worker, use **Demo: fill a test Aadhaar number** on the register page. It generates a checksum-valid number.

---

## How to show the demo

Allow about 8 minutes. Use two browser windows side by side: a normal window for the **worker** and an incognito window for the **employer**. Each window keeps its own session.

Before you present: run `pnpm db:reset`, start `pnpm dev`, and log in to both windows.

| # | Window | Action | What to say |
|---|---|---|---|
| 1 | Worker | Home → **Login** → Worker → Aadhaar `1234 1234 1234` → **Send OTP** → `1234` | "Aadhaar-verified login. Invalid numbers fail the UIDAI checksum." |
| 2 | Worker | **Dashboard**: profile, wages received and pending, skill-matched jobs, open grievance, eligible schemes | "One screen for the worker's whole working life." |
| 3 | Worker | **Find Jobs** → *Carpenter, Kanchipuram* → **Apply** with a note | "Direct application, no middleman." |
| 4 | Employer | Bell badge → *New Job Application* → **Review** → **Hire worker** at ₹800/day | "Hiring creates an employment record, which is the basis for wage tracking." |
| 5 | Employer | **Wage Management → Workforce** → **Log days** (5 days) | "Every day logged is visible to the worker." |
| 6 | Worker | **My Wages**: the new pending entry with its due date | "Wage transparency: no more cash-only, unrecorded pay." |
| 7 | Worker | **Report Issue** on the job → *Delayed payment* | "A wage dispute linked to the exact entry." |
| 8 | Employer | **Grievances** → open it → reply → **Wage Management → Pay** (UPI + UTR) | "Paying the disputed entry resolves the dispute automatically, with proof." |
| 9 | Worker | The grievance shows *Resolved* → **Accept resolution** | "The worker closes the loop. They can also reopen it." |
| 10 | Worker | **Welfare Schemes**: eligibility per scheme → apply to e-Shram with Aadhaar + bank documents → reference number | "Eligibility is computed from the profile, so no guesswork." |
| 11 | Employer | **Post New Job** with skill *Carpentry* or *Painting* → worker window: **Notifications** shows *New Job Match* | "Matching workers are notified instantly." |
| 12 | Either | **Notifications** → mark all read | "Every state change is notified." |

Other seeded workers sign in with their Aadhaar and the on-screen OTP: Rajesh Kumar `9876 5432 1012`, Sunil Verma `8765 4321 0988`, and Dinesh Patel `7654 3210 9878` (Dinesh has an open wage dispute).

---

## Presentation guide

Use 9–10 slides.

1. **Title.** MigrantConnect: dignity, wages and welfare for migrant workers in Tamil Nadu.
2. **Problem.** Estimates of migrant workers in TN, their sectors, and wage theft and delays. Cite a source if you have one (Census 2011 migration tables, or the TN Labour Department).
3. **Stakeholders.** Worker, employer, government (labour and welfare departments).
4. **Existing solutions and their gaps.** e-Shram is registration only. Job portals are not built for blue-collar workers. Grievance cells are offline.
5. **Our solution.** Identity → Jobs → Hiring → Wages → Grievances → Welfare, as one loop (diagram).
6. **Architecture.** Next.js 15 App Router. Route handlers under `app/api/*`. A session cookie (httpOnly, 7 days). JSON-file persistence through `lib/server/db.ts`, which can be swapped for Postgres. OTP via a pluggable SMS webhook.
7. **Trust and safety.** Verhoeff-validated Aadhaar, OTPs hashed with attempt limits and expiry, Aadhaar masked everywhere, role-based access on every API route.
8. **Live demo.** Follow the flow above.
9. **Impact.** A traceable wage history, grievance resolution time, and welfare uptake. SDG 8 (Decent Work) and SDG 10 (Reduced Inequalities).
10. **Future work.** Tamil, Hindi and Odia UI with voice, DigiLocker/UIDAI e-KYC, UPI payouts through the platform, labour-department dashboards with escalation of unresolved grievances, and offline-first PWA mode.

Likely viva questions:
- *How is the Aadhaar validated?* With the Verhoeff checksum, the same algorithm UIDAI uses (`lib/validation.ts`). Real e-KYC would go through UIDAI's API.
- *How do you prevent wage fraud?* Each entry has the days worked, rate, due date, and payment method and reference, and both parties see the same record.
- *How is eligibility decided?* By the rule set on each scheme (age, income, bank account, occupation) evaluated against the profile (`evaluateEligibility` in `lib/server/views.ts`).

---

## Code map

- `app/*`: pages. The worker area is at `/dashboard …`; the employer area is at `/employer/…`.
- `app/api/*`: REST routes:
  - auth: `auth/otp`, `auth/verify`, `auth/register`, `auth/me`, `auth/logout`
  - jobs and hiring: `jobs`, `jobs/[id]`, `jobs/[id]/applicants`, `applications`, `applications/[id]`
  - wages: `wages`, `wages/[id]`, `employments/[id]`
  - grievances: `grievances`, `grievances/[id]`
  - welfare and accounts: `welfare`, `welfare/applications`, `notifications`, `profile`, `employers`, `dev/reset`
- `lib/server/*`: auth, sessions and OTP (`auth.ts`), persistence (`db.ts`), seed data, view builders and eligibility.
- `lib/api.ts`: client fetch helper and `useApi` hook.
- `components/session-provider.tsx`: loads the user and enforces the login and role areas.
- `components/grievance-detail.tsx`, `applicants-view.tsx`, `notifications-view.tsx`: screens shared by both roles.
