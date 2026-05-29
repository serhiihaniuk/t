"use client"

import { useCallback, useMemo, useReducer, useRef, useState } from "react"

import type { TransactionsDashboardActions } from "@/modules/transactions-dashboard/commands/transactions-dashboard-actions"
import {
  createInvoiceDownloadedActivity,
  createInvoiceFailedActivity,
  createInvoiceStartedActivity,
  createRetryResolvedActivity,
  createRetryStartedActivity,
  type DashboardActivity,
} from "@/modules/transactions-dashboard/model/activity/activity-log"
import {
  createDashboardState,
  getRetryableSelectedIds,
  getTransactionsSummary,
  transactionsDashboardReducer,
} from "@/modules/transactions-dashboard/model/dashboard/dashboard-state"
import {
  TRANSACTION_STATUS,
  type RetryPaymentResult,
  type Transaction,
} from "@/modules/transactions-dashboard/model/transaction/transaction"
import {
  INVOICE_FEEDBACK,
  RETRY_FEEDBACK,
  ROW_FEEDBACK_VISIBLE_MS,
  type InvoiceFeedback,
  type RetryFeedback,
} from "./dashboard-feedback"
import { useTimeout } from "./use-timeout"

const MAX_ACTIVITY_ITEMS = 4

interface UseTransactionsDashboardOptions {
  readonly initialTransactions: readonly Transaction[]
  readonly actions: TransactionsDashboardActions
}

function useTransactionsDashboard({
  initialTransactions,
  actions,
}: UseTransactionsDashboardOptions) {
  const [state, dispatch] = useReducer(
    transactionsDashboardReducer,
    initialTransactions,
    createDashboardState
  )
  const [generatingInvoiceIds, setGeneratingInvoiceIds] = useState<
    readonly string[]
  >([])
  const [retryFeedbackById, setRetryFeedbackById] = useState<
    Readonly<Record<string, RetryFeedback | undefined>>
  >({})
  const [invoiceFeedbackById, setInvoiceFeedbackById] = useState<
    Readonly<Record<string, InvoiceFeedback | undefined>>
  >({})
  const [activities, setActivities] = useState<readonly DashboardActivity[]>([])
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false)
  const retryRunIdRef = useRef(0)
  const activitySequenceRef = useRef(0)
  const {
    clearAllTimeouts: clearFeedbackTimeouts,
    scheduleTimeout: scheduleFeedbackTimeout,
  } = useTimeout()

  const retryableSelectedIds = useMemo(
    () => getRetryableSelectedIds(state),
    [state]
  )
  const selectedIdSet = useMemo(
    () => new Set(state.selectedIds),
    [state.selectedIds]
  )
  const retryingIdSet = useMemo(
    () => new Set(state.retryingIds),
    [state.retryingIds]
  )
  const generatingInvoiceIdSet = useMemo(
    () => new Set(generatingInvoiceIds),
    [generatingInvoiceIds]
  )
  const summary = useMemo(
    () => getTransactionsSummary(state.transactions),
    [state.transactions]
  )
  const anyRetryInFlight = state.retryingIds.length > 0

  const addActivity = useCallback(
    (createActivity: (activityId: string) => DashboardActivity): void => {
      const activityId = `activity-${activitySequenceRef.current}`

      activitySequenceRef.current += 1
      setActivities((current) =>
        [createActivity(activityId), ...current].slice(0, MAX_ACTIVITY_ITEMS)
      )
    },
    []
  )

  const scheduleRetryFeedbackRemoval = useCallback(
    (transactionId: string): void => {
      scheduleFeedbackTimeout(
        `retry-feedback:${transactionId}`,
        () => {
          setRetryFeedbackById((current) =>
            omitKeys(current, [transactionId])
          )
        },
        ROW_FEEDBACK_VISIBLE_MS
      )
    },
    [scheduleFeedbackTimeout]
  )

  const scheduleInvoiceFeedbackRemoval = useCallback(
    (transactionId: string): void => {
      scheduleFeedbackTimeout(
        `invoice-feedback:${transactionId}`,
        () => {
          setInvoiceFeedbackById((current) =>
            omitKeys(current, [transactionId])
          )
        },
        ROW_FEEDBACK_VISIBLE_MS
      )
    },
    [scheduleFeedbackTimeout]
  )

  const retryTransaction = useCallback(
    async (transactionId: string, retryRunId: number): Promise<void> => {
      let result: RetryPaymentResult

      try {
        result = await actions.retryPayment(transactionId)
      } catch {
        result = {
          status: TRANSACTION_STATUS.FAILED,
          transactionId,
        }
      }

      if (retryRunIdRef.current !== retryRunId) {
        return
      }

      setRetryFeedbackById((current) => ({
        ...current,
        [transactionId]:
          result.status === TRANSACTION_STATUS.SUCCESS
            ? RETRY_FEEDBACK.RECOVERED
            : RETRY_FEEDBACK.STILL_FAILED,
      }))
      scheduleRetryFeedbackRemoval(transactionId)
      dispatch({ result, type: "retry/resolved" })
      addActivity((activityId) =>
        createRetryResolvedActivity(activityId, result)
      )
    },
    [actions, addActivity, scheduleRetryFeedbackRemoval]
  )

  const handleRetrySelected = useCallback((): void => {
    if (retryableSelectedIds.length === 0) {
      return
    }

    const retryRunId = retryRunIdRef.current

    dispatch({ transactionIds: retryableSelectedIds, type: "retry/started" })
    setRetryFeedbackById((current) => omitKeys(current, retryableSelectedIds))
    addActivity((activityId) =>
      createRetryStartedActivity(activityId, retryableSelectedIds.length)
    )

    retryableSelectedIds.forEach((transactionId) => {
      void retryTransaction(transactionId, retryRunId)
    })
  }, [addActivity, retryableSelectedIds, retryTransaction])

  const handleReset = useCallback((): void => {
    retryRunIdRef.current += 1
    clearFeedbackTimeouts()
    dispatch({ transactions: initialTransactions, type: "state/reset" })
    setGeneratingInvoiceIds([])
    setRetryFeedbackById({})
    setInvoiceFeedbackById({})
    setActivities([])
    setIsActivityLogOpen(false)
  }, [clearFeedbackTimeouts, initialTransactions])

  const handleDownloadInvoice = useCallback(async (
    transaction: Transaction
  ): Promise<void> => {
    setGeneratingInvoiceIds((current) => [...current, transaction.id])
    setInvoiceFeedbackById((current) => omitKeys(current, [transaction.id]))
    addActivity((activityId) =>
      createInvoiceStartedActivity(activityId, transaction.invoiceNumber)
    )

    try {
      const invoice = await actions.generateInvoice(transaction)
      actions.downloadInvoice(
        invoice,
        actions.buildInvoiceFileName(transaction)
      )
      setInvoiceFeedbackById((current) => ({
        ...current,
        [transaction.id]: INVOICE_FEEDBACK.DOWNLOADED,
      }))
      scheduleInvoiceFeedbackRemoval(transaction.id)
      addActivity((activityId) =>
        createInvoiceDownloadedActivity(activityId, transaction.invoiceNumber)
      )
    } catch {
      setInvoiceFeedbackById((current) => ({
        ...current,
        [transaction.id]: INVOICE_FEEDBACK.FAILED,
      }))
      scheduleInvoiceFeedbackRemoval(transaction.id)
      addActivity((activityId) =>
        createInvoiceFailedActivity(activityId, transaction.invoiceNumber)
      )
    } finally {
      setGeneratingInvoiceIds((current) =>
        current.filter((transactionId) => transactionId !== transaction.id)
      )
    }
  }, [actions, addActivity, scheduleInvoiceFeedbackRemoval])

  const toggleSelection = useCallback((transactionId: string) => {
    dispatch({ transactionId, type: "selection/toggled" })
  }, [])

  return {
    activities,
    anyRetryInFlight,
    generatingInvoiceIdSet,
    handleDownloadInvoice,
    handleReset,
    handleRetrySelected,
    invoiceFeedbackById,
    isActivityLogOpen,
    retryableSelectedIds,
    retryFeedbackById,
    retryingIdSet,
    selectedIdSet,
    setIsActivityLogOpen,
    state,
    summary,
    toggleSelection,
  }
}

function omitKeys<T>(
  record: Readonly<Record<string, T | undefined>>,
  keys: readonly string[]
): Readonly<Record<string, T | undefined>> {
  const next = { ...record }

  keys.forEach((key) => {
    delete next[key]
  })

  return next
}

export { useTransactionsDashboard }
