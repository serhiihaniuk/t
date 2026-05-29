import { expect, test as base } from "@playwright/test"

const test = base.extend<{ browserErrors: string[] }>({
  browserErrors: [
    async ({ page }, use) => {
      const browserErrors: string[] = []

      page.on("pageerror", (error) => {
        browserErrors.push(error.message)
      })
      page.on("console", (message) => {
        if (message.type() === "error") {
          browserErrors.push(message.text())
        }
      })

      await use(browserErrors)

      expect(browserErrors).toEqual([])
    },
    { auto: true },
  ],
})

test("server-renders a saved dark theme before hydration", async ({
  context,
  page,
  request,
}) => {
  const response = await request.get("/", {
    headers: {
      cookie: "transactions-dashboard-theme=dark",
    },
  })
  const html = await response.text()

  expect(html).toContain('<html lang="en" class="dark ')
  expect(html).toContain('style="color-scheme:dark"')
  expect(html).toContain('<script id="transactions-dashboard-theme">')
  expect(html).not.toContain("__next_s")

  await context.addCookies([
    {
      name: "transactions-dashboard-theme",
      url: "http://127.0.0.1:3000",
      value: "dark",
    },
  ])
  await page.goto("/", { waitUntil: "domcontentloaded" })

  await expect(page.locator("html")).toHaveClass(/(^| )dark( |$)/)
})

test("renders the payment history and downloads an invoice", async ({
  page,
}) => {
  await page.goto("/")

  await expect(
    page.getByRole("heading", { name: "Transactions" })
  ).toBeVisible()
  await expect(page.getByRole("row", { name: /TXN-2026-0042/i })).toBeVisible()

  const transactionRow = page.getByRole("row", { name: /TXN-2026-0042/i })

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    transactionRow
      .getByRole("button", {
        name: /download invoice for TXN-2026-0042/i,
      })
      .click(),
  ])

  expect(download.suggestedFilename()).toBe(
    "invoice-INV-2026-0042-TXN-2026-0042.pdf"
  )
  await expect(
    transactionRow.getByText("Invoice INV-2026-0042 downloaded")
  ).toBeVisible()
  await expect(
    page
      .getByLabel("Latest activity")
      .getByText("Invoice INV-2026-0042 downloaded")
  ).toBeVisible()

  await page.getByRole("button", { name: /activity/i }).click()
  await expect(
    page
      .getByRole("region", { name: "Activity log" })
      .getByText("Invoice INV-2026-0042 downloaded")
  ).toBeVisible()

  await page.getByRole("heading", { name: "Transactions" }).click()
  await expect(
    page.getByRole("region", { name: "Activity log" })
  ).toBeHidden()
})

test("retries selected failed payments without blocking the whole table", async ({
  page,
}) => {
  await page.goto("/")

  await page
    .getByRole("checkbox", {
      name: /select failed transaction TXN-2026-0039/i,
    })
    .click()
  await page
    .getByRole("checkbox", {
      name: /select failed transaction TXN-2025-0036/i,
    })
    .click()
  await page.getByRole("button", { name: /retry selected/i }).click()

  await expect(
    page.getByRole("row", { name: /TXN-2026-0039.*Retrying/i })
  ).toBeVisible()
  await expect(page.getByText("Retrying")).toHaveCount(0, { timeout: 6_000 })
})

test("resets selected rows and toggles the theme", async ({ page }) => {
  await page.goto("/")

  const failedCheckbox = page.getByRole("checkbox", {
    name: /select failed transaction TXN-2026-0041/i,
  })

  await failedCheckbox.click()
  await expect(
    page.getByRole("button", { name: /retry selected/i })
  ).toBeEnabled()

  await page.getByRole("button", { name: /reset/i }).click()

  await expect(failedCheckbox).not.toBeChecked()
  await expect(
    page.getByRole("button", { name: /retry selected/i })
  ).toBeDisabled()

  const html = page.locator("html")
  const classBeforeToggle = (await html.getAttribute("class")) ?? ""

  await page
    .getByRole("button", { name: /switch to (dark|light) theme/i })
    .click()

  await expect
    .poll(async () => (await html.getAttribute("class")) ?? "")
    .not.toBe(classBeforeToggle)
})
