import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { createMockTransactionsDashboardActions } from "@/modules/transactions-dashboard/commands/transactions-dashboard-actions"
import { listMockTransactions } from "@/modules/transactions-dashboard/model/transaction/mock-transactions"
import {
  TRANSACTION_STATUS,
  type RetryPaymentResult,
} from "@/modules/transactions-dashboard/model/transaction/transaction"
import { TransactionsDashboardClient } from "./TransactionsDashboardClient"

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolver) => {
    resolve = resolver
  })

  return { promise, resolve }
}

function renderDashboard(ui: React.ReactElement) {
  return render(ui)
}

describe("TransactionsDashboard", () => {
  it("retries selected payments concurrently and updates each row as it resolves", async () => {
    const user = userEvent.setup()
    const retryById = new Map<
      string,
      ReturnType<typeof deferred<RetryPaymentResult>>
    >()
    const retryPaymentAction = vi.fn((transactionId: string) => {
      const retry = deferred<RetryPaymentResult>()
      retryById.set(transactionId, retry)
      return retry.promise
    })

    renderDashboard(
      <TransactionsDashboardClient
        initialTransactions={listMockTransactions()}
        actions={createMockTransactionsDashboardActions({
          retryPayment: retryPaymentAction,
        })}
      />
    )

    await user.click(
      screen.getByRole("checkbox", {
        name: /select failed transaction TXN-2026-0039/i,
      })
    )
    await user.click(
      screen.getByRole("checkbox", {
        name: /select failed transaction TXN-2025-0036/i,
      })
    )
    await user.click(screen.getByRole("button", { name: /retry selected/i }))

    expect(retryPaymentAction).toHaveBeenCalledTimes(2)
    expect(retryPaymentAction).toHaveBeenNthCalledWith(1, "TXN-2026-0039")
    expect(retryPaymentAction).toHaveBeenNthCalledWith(2, "TXN-2025-0036")

    const firstRow = screen.getByRole("row", { name: /TXN-2026-0039/i })
    const secondRow = screen.getByRole("row", { name: /TXN-2025-0036/i })

    expect(screen.getByText("Retry started for 2 payments")).toBeVisible()
    expect(within(firstRow).getByText("Retrying")).toBeInTheDocument()
    expect(within(secondRow).getByText("Retrying")).toBeInTheDocument()

    await act(async () => {
      retryById.get("TXN-2026-0039")?.resolve({
        status: TRANSACTION_STATUS.SUCCESS,
        transactionId: "TXN-2026-0039",
      })
    })

    await waitFor(() => {
      expect(within(firstRow).getByText("Success")).toBeInTheDocument()
    })
    expect(screen.getByText("TXN-2026-0039 recovered")).toBeVisible()
    expect(within(firstRow).getByText("Retry recovered")).toBeInTheDocument()
    expect(within(secondRow).getByText("Retrying")).toBeInTheDocument()

    await act(async () => {
      retryById.get("TXN-2025-0036")?.resolve({
        status: TRANSACTION_STATUS.FAILED,
        transactionId: "TXN-2025-0036",
      })
    })

    await waitFor(() => {
      expect(within(secondRow).getByText("Failed")).toBeInTheDocument()
    })
    expect(screen.getByText("TXN-2025-0036 is still failed")).toBeVisible()
    expect(within(secondRow).getByText("Retry failed")).toBeInTheDocument()
  })

  it("shows invoice generation state before downloading the dummy PDF", async () => {
    const user = userEvent.setup()
    const invoice = deferred<Blob>()
    const blob = new Blob(["pdf"], { type: "application/pdf" })
    const generateInvoiceAction = vi.fn(() => invoice.promise)
    const downloadInvoiceAction = vi.fn()

    renderDashboard(
      <TransactionsDashboardClient
        initialTransactions={listMockTransactions()}
        actions={createMockTransactionsDashboardActions({
          downloadInvoice: downloadInvoiceAction,
          generateInvoice: generateInvoiceAction,
        })}
      />
    )

    const row = screen.getByRole("row", { name: /TXN-2026-0042/i })
    const downloadButton = within(row).getByRole("button", {
      name: /download invoice for TXN-2026-0042/i,
    })

    await user.click(downloadButton)

    expect(generateInvoiceAction).toHaveBeenCalledTimes(1)
    expect(screen.getByText("Generating invoice INV-2026-0042")).toBeVisible()
    expect(downloadButton).toBeDisabled()
    expect(within(row).getByText("Generating")).toBeInTheDocument()

    await act(async () => {
      invoice.resolve(blob)
    })

    await waitFor(() => {
      expect(downloadInvoiceAction).toHaveBeenCalledWith(
        blob,
        "invoice-INV-2026-0042-TXN-2026-0042.pdf"
      )
    })
    expect(
      within(row).getByText("Invoice INV-2026-0042 downloaded")
    ).toBeInTheDocument()
    expect(screen.getAllByText("Invoice INV-2026-0042 downloaded")).toHaveLength(
      2
    )
    expect(downloadButton).toBeEnabled()
  })

  it("resets transaction state and row feedback to the original mock data", async () => {
    const user = userEvent.setup()
    const retryPaymentAction = vi.fn(async () => ({
      status: TRANSACTION_STATUS.SUCCESS,
      transactionId: "TXN-2026-0039",
    }))

    renderDashboard(
      <TransactionsDashboardClient
        initialTransactions={listMockTransactions()}
        actions={createMockTransactionsDashboardActions({
          retryPayment: retryPaymentAction,
        })}
      />
    )

    await user.click(
      screen.getByRole("checkbox", {
        name: /select failed transaction TXN-2026-0039/i,
      })
    )
    await user.click(screen.getByRole("button", { name: /retry selected/i }))

    const row = screen.getByRole("row", { name: /TXN-2026-0039/i })

    await waitFor(() => {
      expect(within(row).getByText("Success")).toBeInTheDocument()
    })
    expect(within(row).getByText("Retry recovered")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /reset/i }))

    await waitFor(() => {
      expect(within(row).getByText("Failed")).toBeInTheDocument()
    })
    expect(within(row).queryByText("Retry recovered")).not.toBeInTheDocument()
    expect(screen.getByText("No payment activity yet.")).toBeVisible()
  })
})
