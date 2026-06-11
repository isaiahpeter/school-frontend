# School Management Frontend - TODO

## Phase A (Alignment: Axios + Auth + Routing)
- [ ] 1. Add standardized axios instance at `src/api/axios.*` with:
  - [ ]  Update `src/lib/apiClient.ts` usages (Phase A)

  - [ ] Base URL set to `https://school-api-e09o.onrender.com`
  - [ ] Request interceptor attaches `Authorization: Bearer <token>` from `localStorage` on every request
  - [ ] Response interceptor on 401: clear token + redirect to `/login`
- [ ] 2. Refactor `src/context/AuthContext.tsx` to match required contract:
  - [ ] Persist `{ token, user }` in state
  - [ ] Persist token in `localStorage`
  - [ ] Expose `login`, `logout`, `register`
  - [ ] On startup, hydrate token from `localStorage`
- [ ] 3. Implement `ProtectedRoute` with `roles` prop for admin/teacher/student/parent.
- [ ] 4. Rebuild router to include:
  - [ ] `/login`, `/register`
  - [ ] `/admin`, `/teacher`, `/student`, `/parent` dashboards
  - [ ] Protected wrapper + role redirect
- [ ] 5. Update/replace existing router usage (`AppRoutes` / `AppShell`) to align with requirements.

## Phase B/C (Pages + API + Shared components)
- [ ] 6. Add shared components (Sidebar, DataTable, Modal, Badge, etc.)
- [ ] 7. Implement Auth pages (login/register)
- [ ] 8. Implement admin/teacher/student/parent dashboards section-by-section
- [ ] 9. Add `src/api/*` resource modules and `useApi` hook
- [ ] 10. Add toast + error handling rules everywhere

