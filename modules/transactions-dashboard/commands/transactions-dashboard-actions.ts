import {
  buildInvoiceFileName,
  downloadBlob,
  generateInvoicePdf,
} from "@/modules/transactions-dashboard/model/invoice/invoice-download"
import { retryPayment } from "@/modules/transactions-dashboard/model/payment/retry-payment"
import type {
  DownloadInvoiceAction,
  GenerateInvoiceAction,
  RetryPaymentAction,
  Transaction,
} from "@/modules/transactions-dashboard/model/transaction/transaction"

export interface TransactionsDashboardActions {
  readonly retryPayment: RetryPaymentAction
  readonly generateInvoice: GenerateInvoiceAction
  readonly downloadInvoice: DownloadInvoiceAction
  readonly buildInvoiceFileName: (transaction: Transaction) => string
}

export function createMockTransactionsDashboardActions(
  overrides: Partial<TransactionsDashboardActions> = {}
): TransactionsDashboardActions {
  return {
    buildInvoiceFileName,
    downloadInvoice: downloadBlob,
    generateInvoice: generateInvoicePdf,
    retryPayment,
    ...overrides,
  }
}
