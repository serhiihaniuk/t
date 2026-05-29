import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { memo } from "react"

interface SummaryCardProps {
  readonly label: string
  readonly value: string
  readonly description: string
}

function SummaryCardView({ label, value, description }: SummaryCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

const SummaryCard = memo(SummaryCardView)

export { SummaryCard }
