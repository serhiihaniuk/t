import {
  TRANSACTION_STATUS,
  type RetryPaymentResult,
} from "@/modules/transactions-dashboard/model/transaction/transaction"

export const ACTIVITY_TONE = {
  DANGER: "danger",
  INFO: "info",
  SUCCESS: "success",
} as const

export type ActivityTone = (typeof ACTIVITY_TONE)[keyof typeof ACTIVITY_TONE]

export interface DashboardActivity {
  readonly id: string
  readonly description: string
  readonly title: string
  readonly tone: ActivityTone
}

export function createRetryStartedActivity(
  id: string,
  transactionCount: number
): DashboardActivity {
  return {
    description: "Selected payments are being retried concurrently.",
    id,
    title: `Retry started for ${transactionCount} ${pluralizePayment(
      transactionCount
    )}`,
    tone: ACTIVITY_TONE.INFO,
  }
}

export function createRetryResolvedActivity(
  id: string,
  result: RetryPaymentResult
): DashboardActivity {
  if (result.status === TRANSACTION_STATUS.SUCCESS) {
    return {
      description: "Payment status changed to Success.",
      id,
      title: `${result.transactionId} recovered`,
      tone: ACTIVITY_TONE.SUCCESS,
    }
  }

  return {
    description: "The retry finished, but the payment still needs attention.",
    id,
    title: `${result.transactionId} is still failed`,
    tone: ACTIVITY_TONE.DANGER,
  }
}

export function createInvoiceStartedActivity(
  id: string,
  invoiceNumber: string
): DashboardActivity {
  return {
    description: "Generating a dummy PDF invoice for download.",
    id,
    title: `Generating invoice ${invoiceNumber}`,
    tone: ACTIVITY_TONE.INFO,
  }
}

export function createInvoiceDownloadedActivity(
  id: string,
  invoiceNumber: string
): DashboardActivity {
  return {
    description: "The browser download was triggered successfully.",
    id,
    title: `Invoice ${invoiceNumber} downloaded`,
    tone: ACTIVITY_TONE.SUCCESS,
  }
}

export function createInvoiceFailedActivity(
  id: string,
  invoiceNumber: string
): DashboardActivity {
  return {
    description: "The invoice command failed before the file could download.",
    id,
    title: `Invoice ${invoiceNumber} failed`,
    tone: ACTIVITY_TONE.DANGER,
  }
}

function pluralizePayment(count: number): string {
  return count === 1 ? "payment" : "payments"
}
