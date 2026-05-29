import {
  TRANSACTION_STATUS,
  type RetryPaymentResult,
  type Transaction,
} from "@/modules/transactions-dashboard/model/transaction/transaction"

export interface TransactionsDashboardState {
  readonly transactions: readonly Transaction[]
  readonly selectedIds: readonly string[]
  readonly retryingIds: readonly string[]
}

export type TransactionsDashboardAction =
  | {
      readonly type: "state/reset"
      readonly transactions: readonly Transaction[]
    }
  | { readonly type: "selection/toggled"; readonly transactionId: string }
  | { readonly type: "selection/cleared" }
  | {
      readonly type: "retry/started"
      readonly transactionIds: readonly string[]
    }
  | {
      readonly type: "retry/resolved"
      readonly result: RetryPaymentResult
    }

export interface TransactionsSummary {
  readonly successfulCount: number
  readonly failedCount: number
  readonly totalCents: number
}

export function createDashboardState(
  transactions: readonly Transaction[]
): TransactionsDashboardState {
  return {
    retryingIds: [],
    selectedIds: [],
    transactions,
  }
}

export function transactionsDashboardReducer(
  state: TransactionsDashboardState,
  action: TransactionsDashboardAction
): TransactionsDashboardState {
  switch (action.type) {
    case "state/reset":
      return createDashboardState(action.transactions)
    case "selection/toggled":
      return toggleSelection(state, action.transactionId)
    case "selection/cleared":
      return { ...state, selectedIds: [] }
    case "retry/started":
      return startRetries(state, action.transactionIds)
    case "retry/resolved":
      return resolveRetry(state, action.result)
    default:
      action satisfies never
      return state
  }
}

export function getRetryableSelectedIds(
  state: TransactionsDashboardState
): string[] {
  return state.selectedIds.filter((transactionId) => {
    const transaction = findTransaction(state, transactionId)

    return (
      transaction?.status === TRANSACTION_STATUS.FAILED &&
      !state.retryingIds.includes(transactionId)
    )
  })
}

export function getTransactionsSummary(
  transactions: readonly Transaction[]
): TransactionsSummary {
  let failedCount = 0
  let successfulCount = 0
  let totalCents = 0

  transactions.forEach((transaction) => {
    if (transaction.status === TRANSACTION_STATUS.FAILED) {
      failedCount += 1

      return
    }

    successfulCount += 1
    totalCents += transaction.amountCents
  })

  return {
    failedCount,
    successfulCount,
    totalCents,
  }
}

function toggleSelection(
  state: TransactionsDashboardState,
  transactionId: string
): TransactionsDashboardState {
  const transaction = findTransaction(state, transactionId)

  if (
    transaction?.status !== TRANSACTION_STATUS.FAILED ||
    state.retryingIds.includes(transactionId)
  ) {
    return state
  }

  if (state.selectedIds.includes(transactionId)) {
    return {
      ...state,
      selectedIds: state.selectedIds.filter((id) => id !== transactionId),
    }
  }

  return {
    ...state,
    selectedIds: [...state.selectedIds, transactionId],
  }
}

function startRetries(
  state: TransactionsDashboardState,
  transactionIds: readonly string[]
): TransactionsDashboardState {
  const retryableIds = transactionIds.filter((transactionId) => {
    const transaction = findTransaction(state, transactionId)

    return (
      transaction?.status === TRANSACTION_STATUS.FAILED &&
      !state.retryingIds.includes(transactionId)
    )
  })

  if (retryableIds.length === 0) {
    return state
  }

  const retryingIds = Array.from(
    new Set([...state.retryingIds, ...retryableIds])
  )
  const retryingIdSet = new Set(retryableIds)

  return {
    ...state,
    retryingIds,
    selectedIds: state.selectedIds.filter((id) => !retryingIdSet.has(id)),
  }
}

function resolveRetry(
  state: TransactionsDashboardState,
  result: RetryPaymentResult
): TransactionsDashboardState {
  return {
    ...state,
    retryingIds: state.retryingIds.filter(
      (transactionId) => transactionId !== result.transactionId
    ),
    selectedIds: state.selectedIds.filter(
      (transactionId) => transactionId !== result.transactionId
    ),
    transactions: state.transactions.map((transaction) =>
      transaction.id === result.transactionId
        ? { ...transaction, status: result.status }
        : transaction
    ),
  }
}

function findTransaction(
  state: TransactionsDashboardState,
  transactionId: string
): Transaction | undefined {
  return state.transactions.find(
    (transaction) => transaction.id === transactionId
  )
}
