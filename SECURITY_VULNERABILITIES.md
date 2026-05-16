# Security Vulnerability Audit — Nutri Guide App (Antigravity)

| Field | Value |
|-------|--------|
| **First audit** | May 15, 2026 |
| **Second audit (this revision)** | May 15, 2026 |
| **Stack** | React (Vite) · Express 5 · MongoDB (Mongoose) · JWT · Multi-provider AI (Mistral, Groq, Gemini, OpenRouter) |

This document reflects a **full second-pass** static review of the repository. Items marked **Fixed** were addressed since the first audit. Items marked **Open** or **Partial** still need work.

**Note:** The app uses **MongoDB**, not SQL. Classic **SQL injection does not apply**; NoSQL injection, regex abuse, and application-logic flaws do.

---

## Executive summary (second pass)

| Severity | Open | Fixed since audit #1 |
|----------|------|---------------------|
| Critical | 2 | 3 |
| High | 5 | 6 |
| Medium | 9 | 5 |
| Low | 5 | 2 |

### Top priorities now

1. **Remove hardcoded API keys** from `backend/services/aiService.js` and rotate all exposed credentials immediately.
2. **Add a dedicated server endpoint** for tool-result messages (frontend still sends `role: "tool"` but server forces `role: "user"`).
3. **Fix missing `ChatSession` import** in `mealPlanController.js` (runtime failure + blocks scoped chat context).
4. **Move JWT out of `localStorage`** or accept residual XSS token-theft risk with strict CSP.

---

## Changelog since first audit

| ID | Finding | Status |
|----|---------|--------|
| 1.2 | NoSQL operator injection | **Partial** — `express-mongo-sanitize` added; still coerce query types |
| 1.3 | ReDoS / `$regex` | **Fixed** — escaped in `foodController`, `chatController` |
| 2.1 | Markdown XSS | **Fixed** — `rehype-sanitize` in `MessageBubble.jsx` |
| 3.1 | Auth brute force | **Fixed** — `authLimiter` on login/register |
| 3.2 | Weak passwords | **Fixed** — 12+ char complexity + bcrypt cost 12 |
| 3.4 | JWT secret startup check | **Fixed** — required env validation in `server.js` |
| 3.5 | Auth middleware null user | **Fixed** — user existence check + `return` on token errors |
| 3.6 | Token verify on load | **Fixed** — `GET /api/users/profile` + `AuthContext` verify |
| 4.1 | Client-controlled `role` | **Partial** — forced `role: 'user'`; tool flow broken (see §4.6) |
| 4.2 | Feedback IDOR | **Fixed** — session ownership check |
| 4.3 | Cross-user chat leak in meal plan | **Partial** — query scoped; **missing import** breaks feature (§4.7) |
| 4.4 | No frontend route guards | **Fixed** — `ProtectedRoute` in `App.jsx` |
| 5.1 | Open CORS | **Fixed** — `FRONTEND_URL` whitelist |
| 5.2 | No Helmet | **Fixed** — `helmet()` in `server.js` |
| 5.3 | Verbose errors | **Partial** — global handler exists; controllers still leak `error.message` |
| 5.4 | Dummy Mistral key fallback | **Partial** — Mistral required at boot; **other providers still have hardcoded keys** (§7.4) |
| 6.3 | No rate limiting | **Partial** — global 100/15min; no AI-specific limits |

---

## 1. Injection

### 1.1 SQL injection — **N/A (informational)**

**Status:** Not applicable  
Mongoose ODM only; no raw SQL.

---

### 1.2 NoSQL / operator injection — **Partial**

**Status:** Partially mitigated  
**Location:** `backend/server.js` — `mongoSanitize()` middleware.

**Remaining risk:** `foodController.searchFood` uses `String(q)` but does not reject non-string `req.query.q` before sanitization in all code paths. `country` is assigned without type coercion.

**Solutions:**
- After sanitize: `if (req.query.q != null && typeof req.query.q !== 'string') return res.status(400)...`
- Coerce: `const country = req.query.country ? String(req.query.country).trim() : undefined`

---

### 1.3 ReDoS & `$regex` injection — **Fixed**

**Status:** Mitigated  
**Locations:**
- `backend/controllers/foodController.js` — per-keyword escaped regex
- `backend/controllers/chatController.js` — `escapeRegex` fallback in `executeTool`
- `FoodItem` text index for primary search path

**Residual:** Very long `q` strings (no max length). Cap at ~100 characters.

---

### 1.4 MongoDB `$text` search abuse — **Low**

**Status:** Open (low)  
**Location:** `chatController.js` — `$text: { $search: query }` with AI/user-influenced `query`.

Special characters in `$search` can cause errors or unexpected results (not classic injection).

**Solutions:**
- Sanitize/limit length of `query` before `$text`.
- Wrap in try/catch and fall back to regex only.

---

## 2. Cross-Site Scripting (XSS)

### 2.1 Stored XSS via Markdown — **Fixed**

**Status:** Mitigated  
**Location:** `src/components/chat/MessageBubble.jsx` — `rehypePlugins={[rehypeSanitize]}`.

**Hardening:**
- Configure `rehype-sanitize` schema to disallow `javascript:` / `data:` URLs if not already default.
- Sanitize assistant content server-side before save if multi-tenant trust boundaries grow.

---

### 2.2 XSS → JWT theft (`localStorage`) — **High (chained)**

**Status:** Open  
**Locations:** `src/context/AuthContext.jsx`, `src/api/client.js`.

JWT remains in `localStorage`. Sanitized Markdown reduces XSS likelihood but does not eliminate it (dependency bugs, future UI changes).

**Solutions:**
- httpOnly `Secure` `SameSite=Strict` session cookies + CSRF tokens, or
- Short-lived access token + refresh in httpOnly cookie.
- Strict CSP on frontend host.
- Global axios **401 interceptor** to clear session (not implemented in `client.js`).

---

### 2.3 Reflected XSS in error UI — **Low**

**Status:** Low risk  
Login/Register render API messages as React text nodes — safe if `dangerouslySetInnerHTML` is never used.

---

## 3. Authentication & session management

### 3.1 Brute force on login/register — **Fixed**

**Status:** Mitigated  
**Location:** `backend/server.js` — `authLimiter` (20 requests / 15 min per IP on login/register).

**Improvement:** Add per-email throttling and account lockout after N failures.

---

### 3.2 Password policy — **Fixed**

**Status:** Mitigated  
**Location:** `backend/controllers/userController.js` — regex requiring 12+ chars, upper, lower, digit, special; bcrypt cost **12**.

---

### 3.3 Long-lived JWT (30 days), no revocation — **Medium**

**Status:** Open  
**Location:** `backend/utils/generateToken.js` — `expiresIn: '30d'`.

Logout only clears client storage; stolen tokens remain valid.

**Solutions:** Short-lived access JWT + refresh token + denylist on logout/password change.

---

### 3.4 JWT / Mistral env validation at startup — **Fixed**

**Status:** Mitigated  
**Location:** `backend/server.js` — exits if `JWT_SECRET` or `MISTRAL_API_KEY` missing; warns if secret &lt; 32 chars.

**Gap:** `MONGO_URI` not required — server can start without DB connection warning only.

---

### 3.5 Auth middleware — **Mostly fixed**

**Status:** Partial  
**Location:** `backend/middleware/auth.js`

**Fixed:** User null check; `return` on JWT verification failure.

**Remaining:** Missing `return` when no token (line 27) — can cause inconsistent handler behavior:

```javascript
if (!token) {
  return res.status(401).json({ message: 'Not authorized, no token' });
}
```

---

### 3.6 Token validation on app load — **Fixed**

**Status:** Mitigated  
**Locations:** `AuthContext.jsx` calls `GET /api/users/profile`; `userRoutes.js` exposes route behind `protect`.

**Gap:** `ProtectedRoute` checks `token` only, not `user`. After verify failure, `logout()` clears token — acceptable. Consider requiring `user` for sensitive pages.

---

### 3.7 Email enumeration — **Low**

**Status:** Open  
**Location:** `registerUser` — `"User already exists"`.

**Solution:** Generic registration response.

---

## 4. Broken access control & IDOR

### 4.1 Client-controlled message `role` — **Partial**

**Status:** Partially mitigated  
**Location:** `backend/controllers/chatController.js` — `sendMessage`

```javascript
role: 'user', // FORCE ROLE: USER
```

Client `role` in body is ignored for persistence — **good for security**.

---

### 4.2 Feedback IDOR — **Fixed**

**Status:** Mitigated  
**Location:** `submitFeedback` — populates `session` and compares `message.session.user` to `req.user._id`.

---

### 4.3 Cross-user chat leak in meal plan — **Partial (regression risk)**

**Status:** Logic fixed, **runtime broken**  
**Location:** `backend/controllers/mealPlanController.js` — `buildContext`

Scoped query:

```javascript
const sessions = await ChatSession.find({ user: user._id }).select('_id');
```

**Bug:** `ChatSession` is **not imported** — only `User`, `MealPlan`, `DailyLog`, `Message` are imported. Meal plan generation will throw `ReferenceError: ChatSession is not defined`.

**Solution:**
```javascript
import ChatSession from '../models/ChatSession.js';
```

---

### 4.4 Frontend route guards — **Fixed**

**Status:** Mitigated  
**Location:** `src/App.jsx` — `ProtectedRoute` wraps dashboard, chat, meal-plan, onboarding.

---

### 4.5 Global food DB writable by any user — **Medium**

**Status:** Open  
**Location:** `backend/controllers/foodController.js` — `createFood` has no `createdBy` / ownership.

Any authenticated user can pollute shared search results.

**Solutions:** Per-user custom foods; admin-only global catalog; validate macro ranges (reject negative values).

---

### 4.6 Tool-result messages not stored correctly — **Medium (new)**

**Status:** Open  
**Locations:** `src/pages/Chat.jsx` sends `role: "tool"` in loop; `sendMessage` always saves `role: 'user'`.

Tool outputs are mislabeled in DB and sent to the model as user messages — breaks tool-calling integrity and may confuse the model (indirect prompt-injection surface).

**Solutions:**
- `POST /api/chat/tool-result` — server sets `role: 'tool'`, validates `toolCallId` + session (reuse `executeTool` checks).
- Do not accept tool payloads on `/api/chat/message`.

---

### 4.7 `executeTool` authorization — **Fixed**

**Status:** Mitigated  
**Location:** `chatController.js` — requires `sessionId`, `toolCallId`; verifies session owner; verifies assistant message contains matching tool call; validates `toolName` match.

New tool `get_user_food_logs` correctly scopes logs to `req.user._id`.

---

### 4.8 `mealType` not whitelisted — **Low (new)**

**Status:** Open  
**Location:** `mealPlanController.js` — `commitReplacement` uses `dayPlan.meals[mealType]` without whitelist.

**Solution:** Allow only `Breakfast`, `Lunch`, `Dinner`, `Snacks`.

---

## 5. Security misconfiguration

### 5.1 CORS — **Fixed**

**Status:** Mitigated  
**Location:** `backend/server.js` — `origin: process.env.FRONTEND_URL || 'http://localhost:5173'`.

Ensure production sets `FRONTEND_URL` to exact frontend origin (no wildcard).

---

### 5.2 Helmet / security headers — **Fixed**

**Status:** Mitigated  
**Location:** `backend/server.js` — `app.use(helmet())`.

Tune CSP for Vite HMR in dev vs production builds.

---

### 5.3 Error information disclosure — **Partial**

**Status:** Partial  
**Locations:**
- Global handler in `server.js` hides details when `NODE_ENV === 'production'`.
- Controllers still use `res.status(500).json({ message: error.message })` and never call `next(err)`.

**Solution:** Centralize errors — `catch` blocks call `next(error)`; remove per-controller `error.message` responses in production.

---

### 5.4 Rate limiting — **Partial**

**Status:** Partial  
**Location:** `server.js` — 100 req/15min per IP on `/api/`; auth routes stricter.

**Gaps:**
- No per-user limits on `/api/chat/message`, `/api/meal-plan/generate` (cost abuse).
- Shared IP limit may block corporate NAT users.

**Solutions:** Dedicated AI rate limiter keyed by `req.user._id`; higher IP limit with user cap.

---

### 5.5 `express.json({ limit: '10mb' })` — **Medium**

**Status:** Open  
Enables large base64 image payloads in chat (DoS / DB bloat).

**Solutions:** 2 MB cap on chat routes; object storage for images; validate `data:image/jpeg;base64,...` format server-side.

---

## 6. Insecure design & business logic

### 6.1 Unbounded AI context — **High**

**Status:** Open  
**Location:** `chatController.js` — loads full session history every message.

**Solutions:** Last N messages or token budget; summarize older context.

---

### 6.2 Prompt injection (LLM) — **Medium**

**Status:** Open  
User content and profile fields flow into system prompts across providers.

**Solutions:** Input/output guardrails; never embed secrets in prompts; monitor abuse.

---

### 6.3 Multi-provider AI fallback — **Medium (new)**

**Status:** Open  
**Location:** `backend/services/aiService.js` — cycles Mistral → Groq → Gemini → OpenRouter.

Increases attack surface (more API keys, more logging). Provider failures log `error.message` to console.

**Solutions:** Restrict providers via env config; fail closed if primary unavailable in production.

---

### 6.4 Mass assignment on profile update — **Low**

**Status:** Open  
**Location:** `updateUserProfile` — assigns `healthGoals` without re-validating enum server-side.

**Solution:** Whitelist allowed fields and enum values before `user.save()`.

---

### 6.5 Daily log integrity — **Low**

**Status:** Open  
**Location:** `logController.js` — accepts arbitrary `foodId` in `foodItems` without verifying IDs exist or limiting batch size.

**Solution:** Validate `foodId` references; cap items per request.

---

## 7. Sensitive data exposure

### 7.1 Password hashing — **Fixed**

bcrypt with cost factor 12; password excluded from profile queries.

---

### 7.2 Health / chat PII — **Low (deployment)**

Encrypt MongoDB at rest (Atlas); add data export/delete for compliance if needed.

---

### 7.3 `.env` in `.gitignore` — **Good**

Ensure secrets were never committed; rotate if history contains `.env`.

---

### 7.4 Hardcoded third-party API keys in source — **Critical (new)**

**Status:** Open — **immediate action required**  
**Location:** `backend/services/aiService.js` (approx. lines 8–21)

Fallback literals are embedded for:
- **Groq** (`GROQ_API_KEY || 'gsk_…'`)
- **Google Gemini** (`GEMINI_API_KEY || 'AIzaSy…'`)
- **OpenRouter** (`OPENROUTER_API_KEY || 'sk-or-v1-…'`)

These are **real credentials in version control**. Anyone with repo access can abuse quotas, incur charges, or impersonate your app.

**Solutions (urgent):**
1. **Rotate/revoke** all exposed keys in each provider dashboard **now**.
2. Remove every hardcoded fallback — use `process.env.*` only; fail if missing when that provider is enabled.
3. Scan git history (`git log -p -- backend/services/aiService.js`) and treat history as compromised.
4. Add secret scanning (GitHub Secret Scanning, gitleaks) to CI.
5. Never commit API keys; use environment variables / secret manager in Render, etc.

`MISTRAL_API_KEY` correctly has no literal fallback in production path (startup requires it).

---

## 8. CSRF

### 8.1 Bearer token in `Authorization` header — **Low risk**

**Status:** Acceptable for current SPA design.

If switching to cookie-based auth, add CSRF protection.

---

## 9. SSRF / unsafe URLs

### 9.1 User-supplied `imageUrl` — **Medium**

**Status:** Open  
**Location:** `chatController.js` / multimodal payload to AI providers.

**Solutions:**
- Allow only `data:image/png;base64,` / `data:image/jpeg;base64,` with size cap.
- Reject `http://`, `file://`, and private IP hostnames.

---

## 10. CSP & clickjacking

### 10.1 CSP — **Partial**

Helmet sets defaults; Vite dev may need relaxed `script-src`. Configure explicit CSP for production frontend.

### 10.2 Clickjacking — **Mitigated via Helmet**

Verify `X-Frame-Options` / `frame-ancestors` in production responses.

---

## 11. Dependencies

### 11.1 `npm audit` — **Clean (second pass)**

**Status:** Mitigated (snapshot)  
Root and `backend/` reported **0 vulnerabilities** on May 15, 2026.

**Ongoing:** Run `npm audit` in CI on every PR; pin lockfiles.

---

## 12. Logging & monitoring

### 12.1 Security audit logging — **Low**

**Status:** Open  

Log auth failures, rate-limit hits, repeated 403 on `executeTool`, without logging passwords or JWTs.

---

## 13. Transport & deployment

### 13.1 HTTP localhost defaults — **Low (dev)**

**Status:** Open in dev  
**Location:** `src/api/client.js` — `http://localhost:5000`.

Production must use HTTPS and `VITE_API_URL=https://...`.

---

## 14. Non-web / operational scripts

### 14.1 `advancedSeeder.js` — **Informational**

**Status:** Dev-only risk  
Reads arbitrary directories/CSV paths from `process.argv`. Not exposed via HTTP but avoid running on production with untrusted paths.

---

## Priority remediation roadmap (updated)

| Priority | Item | Status |
|----------|------|--------|
| **P0** | Remove & rotate hardcoded API keys in `aiService.js` | Open |
| **P0** | `import ChatSession` in `mealPlanController.js` | Open |
| **P1** | Dedicated `/api/chat/tool-result` endpoint; stop mislabeling tool messages | Open |
| **P1** | JWT storage strategy (httpOnly cookies or shorter TTL + refresh) | Open |
| **P1** | AI-specific rate limits + history cap | Open |
| **P1** | Route controller errors through global handler | Open |
| **P2** | `imageUrl` validation; reduce JSON body limit on chat | Open |
| **P2** | Food ownership model; `mealType` whitelist | Open |
| **P2** | Axios 401 interceptor; `return` in auth middleware no-token branch | Open |
| **P3** | Email enumeration, audit logging, CSP tuning | Open |

---

## Files reviewed (second pass)

| Area | Files |
|------|--------|
| Server / middleware | `backend/server.js`, `backend/middleware/auth.js` |
| Auth | `backend/controllers/userController.js`, `backend/routes/userRoutes.js`, `backend/utils/generateToken.js` |
| Chat / AI | `backend/controllers/chatController.js`, `backend/services/aiService.js`, `src/pages/Chat.jsx`, `src/components/chat/MessageBubble.jsx` |
| Meal plan | `backend/controllers/mealPlanController.js` |
| Food / logs / check-in | `foodController.js`, `logController.js`, `checkInController.js` |
| Frontend auth | `src/App.jsx`, `src/context/AuthContext.jsx`, `src/components/auth/ProtectedRoute.jsx`, `src/api/client.js` |
| Models | `User.js`, `Message.js`, `FoodItem.js`, `ChatSession.js` |
| Scripts | `backend/scripts/advancedSeeder.js`, `backend/seeder.js` |

---

## Disclaimer

Static code review only — not a penetration test. Re-run after fixes, dependency updates, and before production launch. **If hardcoded API keys were ever pushed to a remote repository, assume they are compromised and rotate immediately.**
