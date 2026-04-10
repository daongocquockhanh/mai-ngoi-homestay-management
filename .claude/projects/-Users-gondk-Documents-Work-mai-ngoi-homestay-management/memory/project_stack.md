---
name: tech-stack-decision
description: Core tech stack chosen for the homestay management system MVP
type: project
---

Tech stack: TypeScript + Node.js + Hono + Drizzle ORM + PostgreSQL + Zod + JWT auth.

**Why:** MVP for a non-technical homestay client, CRUD-heavy, needs fast delivery. TS gives end-to-end type sharing between API and future frontend. Drizzle chosen over Prisma for SQL-first approach matching the existing raw SQL schema.

**How to apply:** All backend code should be written in strict TypeScript. Use Drizzle for DB access, Zod for request validation, Hono for HTTP framework. Keep it simple — no over-engineering.
