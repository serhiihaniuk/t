"use client"

import { DownloadIcon, RefreshCwIcon } from "lucide-react"
import { useMemo, useReducer, useState } from "react"
import { toast } from "sonner"

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
    toast.info(
      `Retrying ${transactionIds.length} failed ${
        transactionIds.length === 1 ? "payment" : "payments"
      }.`
    )

    const retryTasks = transactionIds.map((transactionId) =>
      retryPaymentAction(transactionId)
        .then((result) => {
          dispatch({ result, type: "retry/resolved" })
          return result
        })
        .catch(() => {
          const result = {
            status: TRANSACTION_STATUS.FAILED,
            transactionId,
          }
          dispatch({ result, type: "retry/resolved" })
          return result
        })
    )

    void Promise.all(retryTasks).then((results) => {
      const recoveredCount = results.filter(
        (result) => result.status === TRANSACTION_STATUS.SUCCESS
      ).length

      if (recoveredCount === results.length) {
        toast.success("All selected payments were recovered.")
        return
      }

      if (recoveredCount === 0) {
        toast.error("All selected retries failed. Try again later.")
        return
      }

      toast.info(`${recoveredCount} of ${results.length} payments recovered.`)
    })
  }

  async function handleDownloadInvoice(
    transaction: Transaction
  ): Promise<void> {
    setGeneratingInvoiceIds((current) => [...current, transaction.id])

    try {
      const invoice = await generateInvoiceAction(transaction)
      downloadInvoiceAction(invoice, buildInvoiceFileName(transaction))
      toast.success(`Invoice ${transaction.invoiceNumber} downloaded.`)
    } catch {
      toast.error(`Could not download invoice ${transaction.invoiceNumber}.`)
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
                          status={transaction.status}
                        />
                      </TableCell>
                      <TableCell>{transaction.paymentMethod}</TableCell>
                      <TableCell className="text-right">
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
  readonly status: Transaction["status"]
}

function StatusBadge({ isRetrying, status }: StatusBadgeProps) {
  if (isRetrying) {
    return (
      <Badge variant="outline">
        <Spinner data-icon="inline-start" />
        Retrying
      </Badge>
    )
  }

  return (
    <Badge
      variant={
        status === TRANSACTION_STATUS.SUCCESS ? "default" : "destructive"
      }
      className={cn(status === TRANSACTION_STATUS.SUCCESS && "min-w-16")}
    >
      {status}
    </Badge>
  )
}
