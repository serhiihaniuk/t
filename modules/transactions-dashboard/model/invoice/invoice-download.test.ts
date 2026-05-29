import { describe, expect, it, vi } from "vitest"

import {
  buildInvoiceFileName,
  createInvoicePdfBlob,
  generateInvoicePdf,
  INVOICE_GENERATION_DELAY_MS,
} from "./invoice-download"
import { listMockTransactions } from "@/modules/transactions-dashboard/model/transaction/mock-transactions"

const transaction = listMockTransactions()[0]

describe("invoice download helpers", () => {
  it("creates a deterministic invoice file name", () => {
    expect(buildInvoiceFileName(transaction)).toBe(
      "invoice-INV-2026-0042-TXN-2026-0042.pdf"
    )
  })

  it("creates a dummy PDF blob with invoice details", async () => {
    const blob = createInvoicePdfBlob(transaction)
    const text = await blob.text()

    expect(blob.type).toBe("application/pdf")
    expect(text).toContain("%PDF-1.4")
    expect(text).toContain("INV-2026-0042")
    expect(text).toContain("TXN-2026-0042")
  })

  it("waits 2 seconds before generating the PDF", async () => {
    vi.useFakeTimers()
    const promise = generateInvoicePdf(transaction)
    let settled = false
    const markSettled = async () => {
      await promise
      settled = true
    }

    void markSettled()

    await vi.advanceTimersByTimeAsync(INVOICE_GENERATION_DELAY_MS - 1)
    expect(settled).toBe(false)

    await vi.advanceTimersByTimeAsync(1)

    await expect(promise).resolves.toBeInstanceOf(Blob)
  })
})
