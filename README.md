# ExitPrep

AI-powered practice platform for Ethiopian University Exit Exam preparation, built with Next.js, Supabase, and a modern component system.

## Highlights

- Beautiful, responsive exam experience (timed mode, confidence tagging, answer review)
- Personalized dashboard with readiness score and confidence insights
- Exam catalog with progress tracking and status-aware cards
- Authentication and protected routes via Supabase + middleware
- Modern UI stack (Tailwind v4, Radix UI primitives, shadcn-style components, Framer Motion)

## Tech Stack

- Framework: Next.js 16 (App Router), React 19, TypeScript
- Backend/Auth: Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- State: Zustand
- Styling/UI: Tailwind CSS v4, Radix UI, Lucide icons
- Charts/Visualization: Recharts

## Project Structure

```text
src/
	app/
		auth/                # login/register pages
		dashboard/           # user performance + insights
		exam/[id]/           # exam runner
		exam/[id]/review/    # post-exam review
		exams/               # exam catalog
	components/
		ui/                  # reusable UI primitives
	contexts/
		auth-context.tsx     # auth state and actions
	lib/
		supabase/            # client/server helpers + types
	stores/
		exam-store.ts        # exam session state
middleware.ts            # route protection
```

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3) Run development server

```bash
npm run dev
```

Open http://localhost:3000

## Available Scripts

- `npm run dev` — start development server
- `npm run build` — production build
- `npm run start` — start production server
- `npm run lint` — run ESLint

## Core Features

### Exam Runner
- Timed exam flow
- Confidence tagging (`guessing`, `unsure`, `confident`)
- Option elimination / strike-through
- Manual and auto submit with persisted results

### Review System
- Detailed per-question explanations
- Correct / wrong / skipped breakdown
- Confidence visibility on reviewed answers

### Dashboard
- Readiness score and progress trend
- Exam performance list
- Confidence insights (e.g., confident accuracy, guessing accuracy)

### Exam Catalog
- Progress-aware cards
- Filtering and search
- Best score and attempt status

## Deployment

This project deploys cleanly to Vercel or any Node-compatible environment.

Production checklist:

- Set all required environment variables
- Ensure Supabase project policies (RLS/auth access) are correctly configured
- Run `npm run build` locally before deployment

## Contributing

Contributions are welcome and appreciated.

### How to Contribute

1. Fork the repository
2. Create a feature branch:

	 ```bash
	 git checkout -b feat/your-feature-name
	 ```

3. Make focused changes and keep code style consistent
4. Run quality checks:

	 ```bash
	 npm run lint
	 npm run build
	 ```

5. Commit with clear messages
6. Open a Pull Request with:
	 - What changed
	 - Why it changed
	 - Screenshots/video for UI changes

### Contribution Guidelines

- Keep PRs small and scoped
- Avoid unrelated refactors in the same PR
- Preserve existing UX and theme tokens unless explicitly changing design
- Add/update docs for user-facing or architectural changes

## License

This project is licensed under the MIT License.

See [LICENSE](./LICENSE) for details.
