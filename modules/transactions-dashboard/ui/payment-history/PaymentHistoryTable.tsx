import { memo } from "react"

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { TransactionsDashboardState } from "@/modules/transactions-dashboard/model/dashboard/dashboard-state"
import type { Transaction } from "@/modules/transactions-dashboard/model/transaction/transaction"
import type {
  InvoiceFeedback,
  RetryFeedback,
} from "@/modules/transactions-dashboard/ui/dashboard/dashboard-feedback"
import { PaymentHistoryRow } from "./PaymentHistoryRow"

interface PaymentHistoryTableProps {
  readonly state: TransactionsDashboardState
  readonly generatingInvoiceIdSet: ReadonlySet<string>
  readonly retryingIdSet: ReadonlySet<string>
  readonly selectedIdSet: ReadonlySet<string>
  readonly retryFeedbackById: Readonly<Record<string, RetryFeedback | undefined>>
  readonly invoiceFeedbackById: Readonly<
    Record<string, InvoiceFeedback | undefined>
  >
  readonly onToggleSelection: (transactionId: string) => void
  readonly onDownloadInvoice: (transaction: Transaction) => void
}

function PaymentHistoryTableView({
  state,
  generatingInvoiceIdSet,
  retryingIdSet,
  selectedIdSet,
  retryFeedbackById,
  invoiceFeedbackById,
  onToggleSelection,
  onDownloadInvoice,
}: PaymentHistoryTableProps) {
  return (
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
        {state.transactions.map((transaction) => (
          <PaymentHistoryRow
            key={transaction.id}
            transaction={transaction}
            invoiceFeedback={invoiceFeedbackById[transaction.id]}
            isGeneratingInvoice={generatingInvoiceIdSet.has(transaction.id)}
            isRetrying={retryingIdSet.has(transaction.id)}
            isSelected={selectedIdSet.has(transaction.id)}
            retryFeedback={retryFeedbackById[transaction.id]}
            onDownloadInvoice={onDownloadInvoice}
            onToggleSelection={onToggleSelection}
          />
        ))}
      </TableBody>
    </Table>
  )
}

const PaymentHistoryTable = memo(PaymentHistoryTableView)

export { PaymentHistoryTable }
