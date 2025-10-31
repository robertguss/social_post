# 4. Technical Assumptions

These decisions guide the Architect (Winston) and Developer (James) agents.

- **Repository Structure:** Monorepo (Next.js App with integrated Convex folder).
- **Service Architecture:** Serverless architecture leveraging **Convex Scheduled Functions** for publishing and **Convex Queries/Mutations** for data management.
- **Testing Requirements:** Full Testing Pyramid required, with **specialized Action Testing** (Node.js environment) for API calls, rate limits, and retries.
- **Additional Technical Assumptions and Requests:**
  - OAuth tokens (`accessToken`, `refreshToken`) must be stored **encrypted** within the database layer for security.
  - API integration will be handled by **Convex Actions** to securely access API keys and manage network retries.

---
