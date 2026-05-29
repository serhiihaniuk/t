import { HistoryIcon, XIcon } from "lucide-react"
import { memo } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import {
  ACTIVITY_TONE,
  type DashboardActivity,
} from "@/modules/transactions-dashboard/model/activity/activity-log"

interface ActivityCalloutProps {
  readonly activities: readonly DashboardActivity[]
  readonly isOpen: boolean
  readonly onOpenChange: (isOpen: boolean) => void
}

function ActivityCalloutView({
  activities,
  isOpen,
  onOpenChange,
}: ActivityCalloutProps) {
  return (
    <div className="relative flex w-full min-w-0 items-center gap-2 rounded-xl border border-border bg-muted/30 p-1 shadow-xs sm:w-fit sm:max-w-136">
      <ActivityLogButton
        activities={activities}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
      />
      <div className="min-w-0 flex-1 border-l border-border px-3 py-1">
        <LatestActivity activity={activities[0]} />
      </div>
    </div>
  )
}

interface LatestActivityProps {
  readonly activity: DashboardActivity | undefined
}

function LatestActivity({ activity }: LatestActivityProps) {
  if (!activity) {
    return (
      <p aria-label="Latest activity" className="text-sm text-muted-foreground">
        No payment activity yet.
      </p>
    )
  }

  return (
    <div
      aria-label="Latest activity"
      aria-live="polite"
      className="flex min-w-0 items-center gap-2 text-sm"
    >
      <ActivityDot tone={activity.tone} />
      <div className="min-w-0 truncate">
        <span className="font-medium">Latest: </span>
        <span>{activity.title}</span>
      </div>
    </div>
  )
}

interface ActivityLogButtonProps {
  readonly activities: readonly DashboardActivity[]
  readonly isOpen: boolean
  readonly onOpenChange: (isOpen: boolean) => void
}

function ActivityLogButton({
  activities,
  isOpen,
  onOpenChange,
}: ActivityLogButtonProps) {
  const activityCount = activities.length

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-controls="payment-activity-log"
        >
          <HistoryIcon data-icon="inline-start" />
          Activity
          {activityCount > 0 ? (
            <Badge variant="secondary" className="ml-1 h-4 px-1.5">
              {activityCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        id="payment-activity-log"
        role="region"
        aria-label="Activity log"
        align="start"
        className="w-[min(24rem,calc(100vw-3rem))]"
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Activity</p>
            <p className="text-xs text-muted-foreground">
              Recent retries and invoice commands.
            </p>
          </div>
          <PopoverClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Close activity log"
            >
              <XIcon />
            </Button>
          </PopoverClose>
        </div>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No payment activity yet.
          </p>
        ) : (
          <ol className="space-y-3">
            {activities.map((activity) => (
              <li key={activity.id} className="flex gap-3">
                <ActivityDot tone={activity.tone} />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm leading-5 font-medium">
                    {activity.title}
                  </p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {activity.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </PopoverContent>
    </Popover>
  )
}

interface ActivityDotProps {
  readonly tone: DashboardActivity["tone"]
}

function ActivityDot({ tone }: ActivityDotProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "mt-1.5 size-2 shrink-0 rounded-full",
        tone === ACTIVITY_TONE.SUCCESS && "bg-emerald-500",
        tone === ACTIVITY_TONE.DANGER && "bg-destructive",
        tone === ACTIVITY_TONE.INFO && "bg-primary"
      )}
    />
  )
}

const ActivityCallout = memo(ActivityCalloutView)

export { ActivityCallout }
