import {
  formatMoney,
  formatTransactionDateTime,
} from "@/modules/transactions-dashboard/model/transaction/formatters"
import type { Transaction } from "@/modules/transactions-dashboard/model/transaction/transaction"

export const INVOICE_GENERATION_DELAY_MS = 2_000

interface InvoiceGenerationOptions {
  readonly delayMs?: number
}

export async function generateInvoicePdf(
  transaction: Transaction,
  options: InvoiceGenerationOptions = {}
): Promise<Blob> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, options.delayMs ?? INVOICE_GENERATION_DELAY_MS)
  })

  return createInvoicePdfBlob(transaction)
}

export function createInvoicePdfBlob(transaction: Transaction): Blob {
  const stream = [
    "BT",
    "/F1 18 Tf",
    "72 740 Td",
    `(Streamly Invoice ${escapePdfText(transaction.invoiceNumber)}) Tj`,
    "/F1 11 Tf",
    "0 -32 Td",
    `(Transaction: ${escapePdfText(transaction.id)}) Tj`,
    "0 -18 Td",
    `(Plan: ${escapePdfText(transaction.planName)}) Tj`,
    "0 -18 Td",
    `(Amount: ${escapePdfText(
      formatMoney(transaction.amountCents, transaction.currency)
    )}) Tj`,
    "0 -18 Td",
    `(Date: ${escapePdfText(
      formatTransactionDateTime(transaction.occurredAt)
    )}) Tj`,
    "0 -18 Td",
    `(Payment method: ${escapePdfText(transaction.paymentMethod)}) Tj`,
    "0 -36 Td",
    "(This is a generated mock invoice for the technical task.) Tj",
    "ET",
  ].join("\n")

  const pdf = buildPdfDocument([
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ])

  return new Blob([pdf], { type: "application/pdf" })
}

export function buildInvoiceFileName(transaction: Transaction): string {
  return `invoice-${transaction.invoiceNumber}-${transaction.id}.pdf`
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement("a")

  anchor.href = url
  anchor.download = fileName
  anchor.hidden = true
  document.body.append(anchor)
  anchor.click()
  anchor.remove()

  window.setTimeout(() => {
    window.URL.revokeObjectURL(url)
  }, 0)
}

function buildPdfDocument(objects: readonly string[]): string {
  let document = "%PDF-1.4\n"
  const offsets: number[] = []

  objects.forEach((object, index) => {
    offsets.push(document.length)
    document += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = document.length

  document += `xref\n0 ${objects.length + 1}\n`
  document += "0000000000 65535 f \n"

  offsets.forEach((offset) => {
    document += `${String(offset).padStart(10, "0")} 00000 n \n`
  })

  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`
  document += `startxref\n${xrefOffset}\n%%EOF\n`

  return document
}

function escapePdfText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
}
