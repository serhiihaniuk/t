import type { Transaction } from "@/modules/transactions-dashboard/model/transaction/transaction"
import { ThemeToggle } from "@/modules/transactions-dashboard/ui/theme/ThemeToggle"
import { TransactionsDashboardClient } from "./TransactionsDashboardClient"

interface TransactionsDashboardProps {
  readonly initialTransactions: readonly Transaction[]
}

function TransactionsDashboard({
  initialTransactions,
}: TransactionsDashboardProps) {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
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
          <ThemeToggle />
        </header>

        <TransactionsDashboardClient initialTransactions={initialTransactions} />
      </div>
    </main>
  )
}

export { TransactionsDashboard }
