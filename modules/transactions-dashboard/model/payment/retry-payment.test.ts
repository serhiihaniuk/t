import { describe, expect, it, vi } from "vitest"

import {
  calculateRetryDelayMs,
  isRetrySuccessful,
  MAX_RETRY_DELAY_MS,
  MIN_RETRY_DELAY_MS,
  retryPayment,
} from "./retry-payment"
import { TRANSACTION_STATUS } from "@/modules/transactions-dashboard/model/transaction/transaction"

describe("retryPayment", () => {
  it("calculates delays within the 1 to 4 second retry window", () => {
    expect(calculateRetryDelayMs(0)).toBe(MIN_RETRY_DELAY_MS)
    expect(calculateRetryDelayMs(1)).toBeLessThanOrEqual(MAX_RETRY_DELAY_MS)
    expect(calculateRetryDelayMs(-2)).toBe(MIN_RETRY_DELAY_MS)
  })

  it("uses a 20 percent failure threshold", () => {
    expect(isRetrySuccessful(0.19)).toBe(false)
    expect(isRetrySuccessful(0.2)).toBe(true)
  })

  it("resolves a successful retry after its simulated delay", async () => {
    vi.useFakeTimers()
    const random = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(0.8)
    const promise = retryPayment("TXN-TEST-1", { random })
    let settled = false
    const markSettled = async () => {
      await promise
      settled = true
    }

    void markSettled()

    await vi.advanceTimersByTimeAsync(MIN_RETRY_DELAY_MS - 1)
    expect(settled).toBe(false)

    await vi.advanceTimersByTimeAsync(1)

    await expect(promise).resolves.toEqual({
      status: TRANSACTION_STATUS.SUCCESS,
      transactionId: "TXN-TEST-1",
    })
  })

  it("can resolve back to failed when the simulated payment provider rejects it", async () => {
    vi.useFakeTimers()
    const random = vi.fn().mockReturnValueOnce(0.999).mockReturnValueOnce(0.1)
    const promise = retryPayment("TXN-TEST-2", { random })

    await vi.advanceTimersByTimeAsync(MAX_RETRY_DELAY_MS)

    await expect(promise).resolves.toEqual({
      status: TRANSACTION_STATUS.FAILED,
      transactionId: "TXN-TEST-2",
    })
  })
})
