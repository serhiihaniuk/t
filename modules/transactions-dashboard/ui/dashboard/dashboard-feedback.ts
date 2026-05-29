export const ROW_FEEDBACK_VISIBLE_MS = 5_000

export const RETRY_FEEDBACK = {
  RECOVERED: "recovered",
  STILL_FAILED: "still-failed",
} as const

export type RetryFeedback =
  (typeof RETRY_FEEDBACK)[keyof typeof RETRY_FEEDBACK]

export const INVOICE_FEEDBACK = {
  DOWNLOADED: "downloaded",
  FAILED: "failed",
} as const

export type InvoiceFeedback =
  (typeof INVOICE_FEEDBACK)[keyof typeof INVOICE_FEEDBACK]
