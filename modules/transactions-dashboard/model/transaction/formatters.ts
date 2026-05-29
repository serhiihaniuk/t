import type { CurrencyCode } from "./transaction"

const moneyFormatters = new Map<CurrencyCode, Intl.NumberFormat>()

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  timeZone: "UTC",
  timeZoneName: "short",
  year: "numeric",
})

export function formatMoney(
  amountCents: number,
  currency: CurrencyCode
): string {
  let formatter = moneyFormatters.get(currency)

  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      currency,
      style: "currency",
    })
    moneyFormatters.set(currency, formatter)
  }

  return formatter.format(amountCents / 100)
}

export function formatTransactionDateTime(isoDateTime: string): string {
  return dateTimeFormatter.format(new Date(isoDateTime))
}
