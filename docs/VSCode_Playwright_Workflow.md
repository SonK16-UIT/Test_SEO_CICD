**VS Code + Playwright Workflow (quick guide)**

- **Goal:** Build and iterate POM tests for the production site without source access.

- **Inspecting the site with the browser tool:**
  - Use the browser to open pages like `/`, `/dang-tin`, `/trending`, `/tin-vip` to gather DOM structure.
  - Identify stable container elements (e.g., `.trending-item`, `form`, input `name` attributes) and copy relative XPaths or text-based locators.

- **Pages worth crawling / actions to script:**
  - Home (`/`) — entry points and featured links.
  - Create listing (`/dang-tin`) — full form flow for Phase 1.
  - Trending (`/trending`) and VIP pages — Phase 2 data mining and validation.

- **Using Playwright Tools in VS Code:**
  - Install the Playwright extension for VS Code (Playwright Test for VS Code).
  - Use `npx playwright codegen https://mogi.vn/dang-tin` to interactively generate flows and grab locators.
  - Use the Locator Picker in the extension to validate selectors and copy robust locators (prefer `data-*`, `name`, text contains, or nearest stable class).

- **Rules for robust POMs:**
  - Never put base URLs or locators in `.spec.ts` files. Put routes/selectors in page objects.
  - Prefer text-based, name-based, or `data-testid` selectors where possible. If class names are dynamic, use `:has-text()` or ancestor containers.
  - Add helper methods for common patterns: `fillField(labelOrName, value)`, `waitForNetworkIdle()`, `clearStorage()`.

- **Quick commands:**
  - Run a single spec: `npx playwright test tests/e2e/create-listing.pom.spec.ts`
  - Open codegen: `npx playwright codegen https://mogi.vn/dang-tin`
  - Run with base URL override: `BASE_URL=https://staging.mogi.vn npx playwright test`

- **Playwright Extension tips:**
  - Use the extension's Selector Playground to evaluate robustness, then copy into the POM.
  - Use `page.locator('text=...')` for visible text matches when stable.

- **Final notes:**
  - Keep POM methods tiny, descriptive, and returning useful values (e.g., `getSuccessText()`).
  - When a site is flaky, add explicit `waitForVisible()` in the POM rather than in specs.
