import { ApplicationStatus } from "@/types"
import { STATUS_LABELS } from "@/utils"

interface StatusBadgeProps {
  status: ApplicationStatus
}

const statusStyles: Record<ApplicationStatus, string> = {
  [ApplicationStatus.NEW]: "bg-neutral-100 text-neutral-700",
  [ApplicationStatus.OFFER_SENT]: "bg-blue-50 text-blue-700",
  [ApplicationStatus.ACCEPTED]: "bg-green-50 text-green-700",
  [ApplicationStatus.DECLINED]: "bg-red-50 text-red-700",
  [ApplicationStatus.CONTRACT_SIGNED]: "bg-emerald-50 text-emerald-700",
  [ApplicationStatus.ITEM_TRANSFERRED]: "bg-purple-50 text-purple-700",
  [ApplicationStatus.RETURN_PROCESSED]: "bg-orange-50 text-orange-700",
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  return (
    <span className={`inline-flex px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}