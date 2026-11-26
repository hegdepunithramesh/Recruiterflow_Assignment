# Recruiterflow Assignment

This repository contains two independent software engineering assignments: a frontend take-home application and a backend developer assignment with a SQL challenge. Each project has its own documentation.

## 1. Repository introduction

The frontend, **Trip Splitter**, is the primary project in this repository. The backend, **Recruiter Bot**, is a separate PostgreSQL-backed API with an additional SQL Detective task. They do not depend on each other.

## 2. Trip Splitter — frontend (first)

**Live demo: https://recruiterflowassignment.vercel.app/**

Trip Splitter records shared trip expenses for five friends, splits each cost equally, by exact amount or by percentage, and shows every member's balance. It is a client-only React application with localStorage persistence.

Main features: expense tracking with categories, three split modes, derived member balances, category filtering with live totals, delete with confirmation, validation, accessible responsive interface and safe recovery from invalid saved data.

Tech stack: React 19, strict TypeScript, Redux Toolkit, React Router, Vite, plain CSS with JetBrains Mono, Vitest and React Testing Library.

Full details: [frontend/README.md](frontend/README.md).

## 3. Recruiter Bot — backend (second)

Recruiter Bot is a Node.js, Express and TypeScript API backed by PostgreSQL. It provides candidate-job matching endpoints that rank candidates for a job and jobs for a candidate using handwritten SQL and a documented scoring policy. The same directory also contains the independent **SQL Detective** assignment: five handwritten read-only queries against a separate four-table hiring dataset preserved as supplied.

Tech stack: Node.js 22 or 24, TypeScript, Express 5, PostgreSQL with `pg`, handwritten SQL and Node's test runner.

Full setup, API contract, SQL assumptions and verification evidence: [backend/README.md](backend/README.md).

### Architecture and matching decisions

Matching requests pass through routes, a validating controller and a service that reads profiles through parameterized SQL repositories. A pure TypeScript policy computes scores and ordering without HTTP or database access. Each request uses one read-only `REPEATABLE READ` client for its two data queries, then releases it before scoring. Matches are computed rather than persisted, avoiding stale rankings. The runtime login has SELECT-only access to five domain tables; offline owner tools handle migrations, seeding and verification. SQL Detective uses a separate database and offline commands. The score is an explained heuristic: 80% distinct required-skill coverage and 20% capped experience fit, with deterministic tie and rounding rules. See [backend/README.md](backend/README.md) and its linked design documents for the full rationale and limitations.

## 4. Repository structure

```text
Recruiterflow-Assignment/
├── README.md
├── frontend/
│   ├── README.md
│   └── src/
├── backend/
│   ├── README.md
│   ├── sql_detective.sql
│   └── src/
├── docs/
├── reference/
└── .github/
    └── workflows/
        └── ci.yml
```

## 5. CI

`.github/workflows/ci.yml` runs the frontend typecheck, lint, tests and production build on pushes and pull requests targeting `main`, using Node.js 22 and npm caching. Open the Actions tab to see the latest run status; this README does not claim a particular run result.

## 6. Navigation

- [Trip Splitter documentation](frontend/README.md)
- [Recruiter Bot documentation](backend/README.md)
- [Live Trip Splitter deployment](https://recruiterflowassignment.vercel.app/)
