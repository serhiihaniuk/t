export const TRANSACTION_STATUS = {
  SUCCESS: "Success",
  FAILED: "Failed",
} as const

export type TransactionStatus =
  (typeof TRANSACTION_STATUS)[keyof typeof TRANSACTION_STATUS]

export const CURRENCY = {
  USD: "USD",
} as const

export type CurrencyCode = (typeof CURRENCY)[keyof typeof CURRENCY]

export interface Transaction {
  readonly id: string
  readonly amountCents: number
  readonly currency: CurrencyCode
  readonly occurredAt: string
  readonly status: TransactionStatus
  readonly invoiceNumber: string
  readonly planName: string
  readonly paymentMethod: string
}

export interface RetryPaymentResult {
  readonly transactionId: string
  readonly status:
    | typeof TRANSACTION_STATUS.SUCCESS
    | typeof TRANSACTION_STATUS.FAILED
}

export type RetryPaymentAction = (
  transactionId: string
) => Promise<RetryPaymentResult>

export type GenerateInvoiceAction = (transaction: Transaction) => Promise<Blob>

export type DownloadInvoiceAction = (blob: Blob, fileName: string) => void
