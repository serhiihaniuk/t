import { describe, expect, it } from "vitest"

import {
  createDashboardState,
  getRetryableSelectedIds,
  getTransactionsSummary,
  transactionsDashboardReducer,
} from "./dashboard-state"
import { listMockTransactions } from "./mock-transactions"
import { TRANSACTION_STATUS } from "./types"

describe("transactionsDashboardReducer", () => {
  it("selects only failed transactions that are not retrying", () => {
    const state = createDashboardState(listMockTransactions())

    const withSuccessfulToggle = transactionsDashboardReducer(state, {
      transactionId: "TXN-2026-0042",
      type: "selection/toggled",
    })

    expect(withSuccessfulToggle.selectedIds).toEqual([])

    const withFailedToggle = transactionsDashboardReducer(state, {
      transactionId: "TXN-2026-0039",
      type: "selection/toggled",
    })

    expect(withFailedToggle.selectedIds).toEqual(["TXN-2026-0039"])
    expect(getRetryableSelectedIds(withFailedToggle)).toEqual(["TXN-2026-0039"])
  })

  it("clears selected rows when a retry batch starts", () => {
    const selectedState = transactionsDashboardReducer(
      createDashboardState(listMockTransactions()),
      {
        transactionId: "TXN-2026-0039",
        type: "selection/toggled",
      }
    )

    const retryingState = transactionsDashboardReducer(selectedState, {
      transactionIds: ["TXN-2026-0039"],
      type: "retry/started",
    })

    expect(retryingState.selectedIds).toEqual([])
    expect(retryingState.retryingIds).toEqual(["TXN-2026-0039"])
  })

  it("updates each retried row independently when results resolve", () => {
    const retryingState = transactionsDashboardReducer(
      createDashboardState(listMockTransactions()),
      {
        transactionIds: ["TXN-2026-0039", "TXN-2025-0036"],
        type: "retry/started",
      }
    )

    const firstResolvedState = transactionsDashboardReducer(retryingState, {
      result: {
        status: TRANSACTION_STATUS.SUCCESS,
        transactionId: "TXN-2026-0039",
      },
      type: "retry/resolved",
    })

    expect(firstResolvedState.retryingIds).toEqual(["TXN-2025-0036"])
    expect(
      firstResolvedState.transactions.find(
        (transaction) => transaction.id === "TXN-2026-0039"
      )?.status
    ).toBe(TRANSACTION_STATUS.SUCCESS)
    expect(
      firstResolvedState.transactions.find(
        (transaction) => transaction.id === "TXN-2025-0036"
      )?.status
    ).toBe(TRANSACTION_STATUS.FAILED)

    const secondResolvedState = transactionsDashboardReducer(
      firstResolvedState,
      {
        result: {
          status: TRANSACTION_STATUS.FAILED,
          transactionId: "TXN-2025-0036",
        },
        type: "retry/resolved",
      }
    )

    expect(secondResolvedState.retryingIds).toEqual([])
    expect(
      secondResolvedState.transactions.find(
        (transaction) => transaction.id === "TXN-2025-0036"
      )?.status
    ).toBe(TRANSACTION_STATUS.FAILED)
  })

  it("summarizes successful billing separately from failed rows", () => {
    const summary = getTransactionsSummary(listMockTransactions())

    expect(summary.successfulCount).toBe(3)
    expect(summary.failedCount).toBe(7)
    expect(summary.totalCents).toBe(5_997)
  })
})
