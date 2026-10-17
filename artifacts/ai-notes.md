# AI-Assisted Development Notes

## Working prompt

> Build an end-to-end salary-management application for ACME HR, supporting 10,000 employees across countries. First preserve a one-page requirements document. Use a relational backend and React UI. Include deterministic 10,000-person seeding, search/filter/sort/pagination, compensation edits, salary insights, meaningful fast tests, setup instructions, and explain important scope and performance trade-offs. Keep compensation comparisons currency-aware.

## How AI was used

- Used the product brief and repository contents to identify the existing FastAPI health endpoint, React/Vite scaffold, and requirements document before implementation.
- Used AI-assisted implementation to develop the API and dashboard in small slices, then ran tests, TypeScript build, and ESLint as checks rather than treating generated code as verified.
- Added tests around identity uniqueness, filtered search, sorting, currency-separated analytics, compensation update validation, employee creation, and deterministic seed generation.
- Inspected the shared ChatGPT URL supplied with the assessment. It returned only the shared-chat wrapper/login shell in this environment, with no conversation content; implementation therefore follows the full specification included in the assessment.

## Engineering checks

AI output was treated as a draft. Behavior was verified with local API tests and the frontend production build/linter. The seed contains synthetic data only. The remaining release actions (security review, deployment, and recording a video) require a deployment target and human review; they are not claimed as completed here.
