import { expect, test } from "@playwright/test"

test("renders the payment history and downloads an invoice", async ({
  page,
}) => {
  await page.goto("/")

  await expect(
    page.getByRole("heading", { name: "Transactions" })
  ).toBeVisible()
  await expect(page.getByRole("row", { name: /TXN-2026-0042/i })).toBeVisible()

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", {
        name: /download invoice for TXN-2026-0042/i,
      })
      .click(),
  ])

  expect(download.suggestedFilename()).toBe(
    "invoice-INV-2026-0042-TXN-2026-0042.pdf"
  )
  await expect(page.getByText("Invoice INV-2026-0042 downloaded")).toBeVisible()
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
