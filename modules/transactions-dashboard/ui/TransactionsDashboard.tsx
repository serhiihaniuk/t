"use client"

import { DownloadIcon, RefreshCwIcon } from "lucide-react"
import { useMemo, useReducer, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

import {
  createDashboardState,
  getRetryableSelectedIds,
  getTransactionsSummary,
  transactionsDashboardReducer,
} from "../model/dashboard-state"
import {
  buildInvoiceFileName,
  downloadBlob,
  generateInvoicePdf,
} from "../model/invoice-download"
import { retryPayment } from "../model/retry-payment"
import {
  TRANSACTION_STATUS,
  type DownloadInvoiceAction,
  type GenerateInvoiceAction,
  type RetryPaymentAction,
  type Transaction,
} from "../model/types"
import { formatMoney, formatTransactionDateTime } from "../model/formatters"

const RETRY_FEEDBACK = {
  RECOVERED: "recovered",
  STILL_FAILED: "still-failed",
} as const

type RetryFeedback = (typeof RETRY_FEEDBACK)[keyof typeof RETRY_FEEDBACK]

const INVOICE_FEEDBACK = {
  DOWNLOADED: "downloaded",
  FAILED: "failed",
} as const

type InvoiceFeedback = (typeof INVOICE_FEEDBACK)[keyof typeof INVOICE_FEEDBACK]

interface TransactionsDashboardProps {
  readonly initialTransactions: readonly Transaction[]
  readonly retryPaymentAction?: RetryPaymentAction
  readonly generateInvoiceAction?: GenerateInvoiceAction
  readonly downloadInvoiceAction?: DownloadInvoiceAction
}

export function TransactionsDashboard({
  initialTransactions,
  retryPaymentAction = retryPayment,
  generateInvoiceAction = generateInvoicePdf,
  downloadInvoiceAction = downloadBlob,
}: TransactionsDashboardProps) {
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

  const retryableSelectedIds = getRetryableSelectedIds(state)
  const summary = useMemo(
    () => getTransactionsSummary(state.transactions),
    [state.transactions]
  )
  const anyRetryInFlight = state.retryingIds.length > 0

  function handleRetrySelected(): void {
    const transactionIds = getRetryableSelectedIds(state)

    if (transactionIds.length === 0) {
      return
    }

    dispatch({ transactionIds, type: "retry/started" })
    setRetryFeedbackById((current) => omitKeys(current, transactionIds))

    transactionIds.forEach((transactionId) => {
      void retryPaymentAction(transactionId)
        .then((result) => {
          setRetryFeedbackById((current) => ({
            ...current,
            [transactionId]:
              result.status === TRANSACTION_STATUS.SUCCESS
                ? RETRY_FEEDBACK.RECOVERED
                : RETRY_FEEDBACK.STILL_FAILED,
          }))
          dispatch({ result, type: "retry/resolved" })
          return result
        })
        .catch(() => {
          const result = {
            status: TRANSACTION_STATUS.FAILED,
            transactionId,
          }
          setRetryFeedbackById((current) => ({
            ...current,
            [transactionId]: RETRY_FEEDBACK.STILL_FAILED,
          }))
          dispatch({ result, type: "retry/resolved" })
          return result
        })
    })
  }

  async function handleDownloadInvoice(
    transaction: Transaction
  ): Promise<void> {
    setGeneratingInvoiceIds((current) => [...current, transaction.id])
    setInvoiceFeedbackById((current) => omitKeys(current, [transaction.id]))

    try {
      const invoice = await generateInvoiceAction(transaction)
      downloadInvoiceAction(invoice, buildInvoiceFileName(transaction))
      setInvoiceFeedbackById((current) => ({
        ...current,
        [transaction.id]: INVOICE_FEEDBACK.DOWNLOADED,
      }))
    } catch {
      setInvoiceFeedbackById((current) => ({
        ...current,
        [transaction.id]: INVOICE_FEEDBACK.FAILED,
      }))
    } finally {
      setGeneratingInvoiceIds((current) =>
        current.filter((transactionId) => transactionId !== transaction.id)
      )
    }
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-muted-foreground">
              Streamly billing
            </p>
            <h1 className="font-heading text-2xl font-medium tracking-normal sm:text-3xl">
              Transactions
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Review subscription charges, download invoices, and retry failed
              payments in bulk.
            </p>
          </div>
          <Button
            type="button"
            variant={
              retryableSelectedIds.length === 0 ? "secondary" : "default"
            }
            disabled={retryableSelectedIds.length === 0}
            onClick={handleRetrySelected}
          >
            {anyRetryInFlight ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <RefreshCwIcon data-icon="inline-start" />
            )}
            Retry selected
          </Button>
        </header>

        <section
          aria-label="Transaction summary"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <SummaryCard
            label="Billed"
            value={formatMoney(summary.totalCents, "USD")}
            description="Successful payments"
          />
          <SummaryCard
            label="Successful"
            value={String(summary.successfulCount)}
            description="Completed transactions"
          />
          <SummaryCard
            label="Failed"
            value={String(summary.failedCount)}
            description="Eligible for retry"
          />
          <SummaryCard
            label="Selected"
            value={String(retryableSelectedIds.length)}
            description="Queued for bulk retry"
          />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Payment history</CardTitle>
            <CardDescription>
              Invoices are generated locally as dummy PDF files for this mock.
            </CardDescription>
            <CardAction>
              <Badge variant="outline">
                {state.transactions.length} transactions
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <span className="sr-only">Select</span>
                  </TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date and time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment method</TableHead>
                  <TableHead className="text-right">Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.transactions.map((transaction) => {
                  const isSelected = state.selectedIds.includes(transaction.id)
                  const isRetrying = state.retryingIds.includes(transaction.id)
                  const isGeneratingInvoice = generatingInvoiceIds.includes(
                    transaction.id
                  )
                  const retryFeedback = retryFeedbackById[transaction.id]
                  const invoiceFeedback = invoiceFeedbackById[transaction.id]
                  const canSelect =
                    transaction.status === TRANSACTION_STATUS.FAILED &&
                    !isRetrying

                  return (
                    <TableRow
                      key={transaction.id}
                      data-state={isSelected ? "selected" : undefined}
                    >
                      <TableCell>
                        <RetrySelector
                          canSelect={canSelect}
                          isRetrying={isRetrying}
                          isSelected={isSelected}
                          transactionId={transaction.id}
                          onToggle={() =>
                            dispatch({
                              transactionId: transaction.id,
                              type: "selection/toggled",
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-44 flex-col gap-1">
                          <span className="font-mono text-xs font-medium">
                            {transaction.id}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {transaction.planName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatMoney(
                          transaction.amountCents,
                          transaction.currency
                        )}
                      </TableCell>
                      <TableCell>
                        {formatTransactionDateTime(transaction.occurredAt)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          isRetrying={isRetrying}
                          retryFeedback={retryFeedback}
                          status={transaction.status}
                        />
                      </TableCell>
                      <TableCell>{transaction.paymentMethod}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex min-w-36 flex-col items-end gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isGeneratingInvoice}
                            aria-label={`Download invoice for ${transaction.id}`}
                            onClick={() =>
                              void handleDownloadInvoice(transaction)
                            }
                          >
                            {isGeneratingInvoice ? (
                              <Spinner data-icon="inline-start" />
                            ) : (
                              <DownloadIcon data-icon="inline-start" />
                            )}
                            {isGeneratingInvoice ? "Generating" : "Download"}
                          </Button>
                          <InvoiceFeedbackLine
                            feedback={invoiceFeedback}
                            invoiceNumber={transaction.invoiceNumber}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

interface SummaryCardProps {
  readonly label: string
  readonly value: string
  readonly description: string
}

function SummaryCard({ label, value, description }: SummaryCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

interface RetrySelectorProps {
  readonly canSelect: boolean
  readonly isRetrying: boolean
  readonly isSelected: boolean
  readonly transactionId: string
  readonly onToggle: () => void
}

function RetrySelector({
  canSelect,
  isRetrying,
  isSelected,
  transactionId,
  onToggle,
}: RetrySelectorProps) {
  if (isRetrying) {
    return <Spinner aria-label={`Retrying payment ${transactionId}`} />
  }

  if (!canSelect) {
    return (
      <span aria-hidden="true" className="text-muted-foreground">
        -
      </span>
    )
  }

  return (
    <Checkbox
      checked={isSelected}
      aria-label={`Select failed transaction ${transactionId}`}
      onCheckedChange={onToggle}
    />
  )
}

interface StatusBadgeProps {
  readonly isRetrying: boolean
  readonly retryFeedback: RetryFeedback | undefined
  readonly status: Transaction["status"]
}

function StatusBadge({ isRetrying, retryFeedback, status }: StatusBadgeProps) {
  if (isRetrying) {
    return (
      <Badge variant="outline">
        <Spinner data-icon="inline-start" />
        Retrying
      </Badge>
    )
  }

  return (
    <div className="flex min-w-24 flex-col items-start gap-1">
      <Badge
        variant={
          status === TRANSACTION_STATUS.SUCCESS ? "default" : "destructive"
        }
        className={cn(status === TRANSACTION_STATUS.SUCCESS && "min-w-16")}
      >
        {status}
      </Badge>
      <RetryFeedbackLine feedback={retryFeedback} />
    </div>
  )
}

interface RetryFeedbackLineProps {
  readonly feedback: RetryFeedback | undefined
}

function RetryFeedbackLine({ feedback }: RetryFeedbackLineProps) {
  if (!feedback) {
    return null
  }

  return (
    <span
      aria-live="polite"
      className={cn(
        "text-xs",
        feedback === RETRY_FEEDBACK.RECOVERED
          ? "text-muted-foreground"
          : "text-destructive"
      )}
    >
      {feedback === RETRY_FEEDBACK.RECOVERED
        ? "Retry recovered"
        : "Retry failed"}
    </span>
  )
}

interface InvoiceFeedbackLineProps {
  readonly feedback: InvoiceFeedback | undefined
  readonly invoiceNumber: string
}

function InvoiceFeedbackLine({
  feedback,
  invoiceNumber,
}: InvoiceFeedbackLineProps) {
  if (!feedback) {
    return null
  }

  return (
    <span
      aria-live="polite"
      className={cn(
        "text-xs",
        feedback === INVOICE_FEEDBACK.DOWNLOADED
          ? "text-muted-foreground"
          : "text-destructive"
      )}
    >
      {feedback === INVOICE_FEEDBACK.DOWNLOADED
        ? `Invoice ${invoiceNumber} downloaded`
        : "Download failed"}
    </span>
  )
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
