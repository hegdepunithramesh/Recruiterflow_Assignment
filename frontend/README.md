# Trip Splitter

## 1. Project overview

Trip Splitter is a browser app for recording shared trip costs and settling up. Five friends enter expenses, choose how each is split, and immediately see who gets money back and who owes. It runs entirely in the browser with no backend.

## 2. Live demo

https://recruiterflowassignment.vercel.app/

## 3. Tech stack

React 19, strict TypeScript, Redux Toolkit and React Redux, React Router, Vite, plain CSS, self-hosted JetBrains Mono (`@fontsource`), Vitest with React Testing Library and jsdom, and browser localStorage.

## 4. Features

- Track expenses with description, amount, payer, date and category.
- Five predefined members with derived balances.
- Equal, exact-paise and percentage splits with deterministic remainder handling.
- Category filtering with a live total for visible expenses.
- Deletion with an accessible confirmation dialog.
- localStorage persistence with safe fallback to sample data.
- Responsive, keyboard-accessible interface with large monospace typography.

## 5. Getting started

Commands run from the `frontend/` directory:

```bash
cd frontend
npm ci
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
```

The dev server prints its local URL; `npm run build` writes `dist/`.

## 6. Important implementation decisions

- Money is stored as integer paise and formatted with string grouping, so arithmetic never loses precision.
- Redux Toolkit holds members and expenses; balances are derived by pure utilities, never stored in state.
- Expenses persist under `trip-splitter-expenses` via middleware, keeping reducers pure.

## 7. Testing

Vitest and React Testing Library cover money, splits, balances, validation, persistence, Redux and the UI. Final verified count: **89 passing tests**.

## 8. Future enhancements

Possible future work, not implemented: dynamic member management and multiple trips; receipt image uploads with cloud storage; OCR-based receipt extraction; authentication and shared trips; expense settlement tracking.


