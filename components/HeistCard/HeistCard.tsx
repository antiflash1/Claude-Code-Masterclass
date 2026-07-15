import Link from "next/link"
import { Calendar, Clock, User } from "lucide-react"
import { formatTimeRemaining } from "@/lib/formatTimeRemaining"
import type { Heist } from "@/types/firestore"
import styles from "./HeistCard.module.css"

type HeistCardProps = {
  heist: Heist
}

function formatDeadline(deadline: Date): string {
  return deadline.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function HeistCard({ heist }: HeistCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.titleRow}>
        <Link href={`/heists/${heist.id}`} className={styles.title}>
          {heist.title}
        </Link>
        <Clock size={16} strokeWidth={1.5} className={styles.clockIcon} />
      </div>
      <div className={styles.meta}>
        <div className={styles.metaRow}>
          <User size={14} strokeWidth={1.5} />
          <span>
            To: <span className={styles.to}>{heist.assignedToCodeName}</span>
          </span>
        </div>
        <div className={styles.metaRow}>
          <User size={14} strokeWidth={1.5} />
          <span>
            By: <span className={styles.by}>{heist.createdByCodename}</span>
          </span>
        </div>
        <div className={styles.metaRow}>
          <Calendar size={14} strokeWidth={1.5} />
          <span>
            {formatDeadline(heist.deadline)} ·{" "}
            <span className={styles.timeRemaining}>
              {formatTimeRemaining(heist.deadline)}
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}
