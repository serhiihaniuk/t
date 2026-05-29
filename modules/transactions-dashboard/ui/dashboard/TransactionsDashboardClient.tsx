"use client"

import { RefreshCwIcon, RotateCcwIcon } from "lucide-react"
import { useCallback } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

import {
  createMockTransactionsDashboardActions,
  type TransactionsDashboardActions,
} from "@/modules/transactions-dashboard/commands/transactions-dashboard-actions"
import { formatMoney } from "@/modules/transactions-dashboard/model/transaction/formatters"
import type { Transaction } from "@/modules/transactions-dashboard/model/transaction/transaction"
import { ActivityCallout } from "@/modules/transactions-dashboard/ui/activity/ActivityCallout"
import { PaymentHistoryTable } from "@/modules/transactions-dashboard/ui/payment-history/PaymentHistoryTable"
import { SummaryCard } from "@/modules/transactions-dashboard/ui/summary/SummaryCard"
import { useTransactionsDashboard } from "./use-transactions-dashboard"

interface TransactionsDashboardClientProps {
  readonly initialTransactions: readonly Transaction[]
  readonly actions?: TransactionsDashboardActions
}

const DEFAULT_DASHBOARD_ACTIONS = createMockTransactionsDashboardActions()

function TransactionsDashboardClient({
  initialTransactions,
  actions = DEFAULT_DASHBOARD_ACTIONS,
}: TransactionsDashboardClientProps) {
  const dashboard = useTransactionsDashboard({ actions, initialTransactions })
  const { handleDownloadInvoice } = dashboard
  const onDownloadInvoice = useCallback(
    (transaction: Transaction) => {
      void handleDownloadInvoice(transaction)
    },
    [handleDownloadInvoice]
  )

  return (
    <>
      <section
        aria-label="Transaction summary"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <SummaryCard
          label="Billed"
          value={formatMoney(dashboard.summary.totalCents, "USD")}
          description="Successful payments"
        />
        <SummaryCard
          label="Successful"
          value={String(dashboard.summary.successfulCount)}
          description="Completed transactions"
        />
        <SummaryCard
          label="Failed"
          value={String(dashboard.summary.failedCount)}
          description="Eligible for retry"
        />
        <SummaryCard
          label="Selected"
          value={String(dashboard.retryableSelectedIds.length)}
          description="Queued for bulk retry"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
          <CardDescription>
            Invoices are generated locally as dummy PDF files for this mock.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <Badge variant="outline">
              {dashboard.state.transactions.length} transactions
            </Badge>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
              <ActivityCallout
                activities={dashboard.activities}
                isOpen={dashboard.isActivityLogOpen}
                onOpenChange={dashboard.setIsActivityLogOpen}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={dashboard.handleReset}
              >
                <RotateCcwIcon data-icon="inline-start" />
                Reset
              </Button>
              <Button
                type="button"
                variant={
                  dashboard.retryableSelectedIds.length === 0
                    ? "secondary"
                    : "default"
                }
                size="sm"
                disabled={dashboard.retryableSelectedIds.length === 0}
                onClick={dashboard.handleRetrySelected}
              >
                {dashboard.anyRetryInFlight ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <RefreshCwIcon data-icon="inline-start" />
                )}
                Retry selected
              </Button>
            </div>
          </div>

          <PaymentHistoryTable
            state={dashboard.state}
            generatingInvoiceIdSet={dashboard.generatingInvoiceIdSet}
            invoiceFeedbackById={dashboard.invoiceFeedbackById}
            retryFeedbackById={dashboard.retryFeedbackById}
            retryingIdSet={dashboard.retryingIdSet}
            selectedIdSet={dashboard.selectedIdSet}
            onToggleSelection={dashboard.toggleSelection}
            onDownloadInvoice={onDownloadInvoice}
          />
        </CardContent>
      </Card>
    </>
  )
}

export { TransactionsDashboardClient }
