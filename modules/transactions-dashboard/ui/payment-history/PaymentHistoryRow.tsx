import { DownloadIcon } from "lucide-react"
import { memo } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

import {
  formatMoney,
  formatTransactionDateTime,
} from "@/modules/transactions-dashboard/model/transaction/formatters"
import {
  TRANSACTION_STATUS,
  type Transaction,
} from "@/modules/transactions-dashboard/model/transaction/transaction"
import {
  INVOICE_FEEDBACK,
  RETRY_FEEDBACK,
  type InvoiceFeedback,
  type RetryFeedback,
} from "@/modules/transactions-dashboard/ui/dashboard/dashboard-feedback"

interface PaymentHistoryRowProps {
  readonly transaction: Transaction
  readonly isGeneratingInvoice: boolean
  readonly isRetrying: boolean
  readonly isSelected: boolean
  readonly retryFeedback: RetryFeedback | undefined
  readonly invoiceFeedback: InvoiceFeedback | undefined
  readonly onToggleSelection: (transactionId: string) => void
  readonly onDownloadInvoice: (transaction: Transaction) => void
}

function PaymentHistoryRowView({
  transaction,
  isGeneratingInvoice,
  isRetrying,
  isSelected,
  retryFeedback,
  invoiceFeedback,
  onToggleSelection,
  onDownloadInvoice,
}: PaymentHistoryRowProps) {
  const canSelect =
    transaction.status === TRANSACTION_STATUS.FAILED && !isRetrying

  return (
    <TableRow data-state={isSelected ? "selected" : undefined}>
      <TableCell>
        <RetrySelector
          canSelect={canSelect}
          isRetrying={isRetrying}
          isSelected={isSelected}
          transactionId={transaction.id}
          onToggle={() => onToggleSelection(transaction.id)}
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
        {formatMoney(transaction.amountCents, transaction.currency)}
      </TableCell>
      <TableCell>{formatTransactionDateTime(transaction.occurredAt)}</TableCell>
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
            onClick={() => onDownloadInvoice(transaction)}
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

function RetryFeedbackLine({
  feedback,
}: {
  readonly feedback: RetryFeedback | undefined
}) {
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

function InvoiceFeedbackLine({
  feedback,
  invoiceNumber,
}: {
  readonly feedback: InvoiceFeedback | undefined
  readonly invoiceNumber: string
}) {
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

const PaymentHistoryRow = memo(PaymentHistoryRowView)

export { PaymentHistoryRow }
