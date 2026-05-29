# Examples

## Component retry test shape

```tsx
it("retries selected payments concurrently and updates each row as it resolves", async () => {
  const user = userEvent.setup()
  const retryById = new Map<string, ReturnType<typeof deferred<RetryPaymentResult>>>()
  const retryPayment = vi.fn((transactionId: string) => {
    const retry = deferred<RetryPaymentResult>()
    retryById.set(transactionId, retry)
    return retry.promise
  })

  render(
    <TransactionsDashboardClient
      initialTransactions={listMockTransactions()}
      actions={createMockTransactionsDashboardActions({ retryPayment })}
    />
  )

  await user.click(screen.getByRole("checkbox", { name: /select failed transaction TXN-2026-0039/i }))
  await user.click(screen.getByRole("button", { name: /retry selected/i }))

  const row = screen.getByRole("row", { name: /TXN-2026-0039/i })
  expect(within(row).getByText("Retrying")).toBeInTheDocument()
})
```

## Invoice download E2E shape

```ts
const row = page.getByRole("row", { name: /TXN-2026-0042/i })
const [download] = await Promise.all([
  page.waitForEvent("download"),
  row.getByRole("button", { name: /download invoice for TXN-2026-0042/i }).click(),
])

expect(download.suggestedFilename()).toBe("invoice-INV-2026-0042-TXN-2026-0042.pdf")
```

## Raw HTML theme check

```ts
const response = await request.get("/", {
  headers: {
    cookie: "transactions-dashboard-theme=dark",
  },
})
const html = await response.text()

expect(html).toContain('<html lang="en" class="dark ')
expect(html).toContain('style="color-scheme:dark"')
expect(html).toContain('<script id="transactions-dashboard-theme">')
```

## Popover outside-click check

```ts
await page.getByRole("button", { name: /activity/i }).click()
await expect(page.getByRole("region", { name: "Activity log" })).toBeVisible()

await page.getByRole("heading", { name: "Transactions" }).click()
await expect(page.getByRole("region", { name: "Activity log" })).toBeHidden()
```

## Smell example

Avoid this:

```ts
await page.waitForTimeout(2000)
```

Prefer event/state synchronization:

```ts
await expect(row.getByText("Invoice INV-2026-0042 downloaded")).toBeVisible()
```
