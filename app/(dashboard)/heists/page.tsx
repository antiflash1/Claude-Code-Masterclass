"use client"

import HeistCard from "@/components/HeistCard"
import HeistCardSkeleton from "@/components/HeistCardSkeleton"
import { useHeist } from "@/lib/useHeist"
import styles from "./page.module.css"

export default function HeistsPage() {
  const { heists: activeHeists, loading: activeLoading } = useHeist("active")
  const { heists: assignedHeists, loading: assignedLoading } =
    useHeist("assigned")
  const { heists: expiredHeists } = useHeist("expired")

  return (
    <div className="page-content">
      <div className="active-heists">
        <h2>Your Active Heists</h2>
        <div className={styles.grid}>
          {activeLoading
            ? Array.from({ length: 3 }, (_, i) => <HeistCardSkeleton key={i} />)
            : activeHeists.map((heist) => (
                <HeistCard key={heist.id} heist={heist} />
              ))}
        </div>
      </div>
      <div className="assigned-heists">
        <h2>Heists You&apos;ve Assigned</h2>
        <div className={styles.grid}>
          {assignedLoading
            ? Array.from({ length: 3 }, (_, i) => <HeistCardSkeleton key={i} />)
            : assignedHeists.map((heist) => (
                <HeistCard key={heist.id} heist={heist} />
              ))}
        </div>
      </div>
      <div className="expired-heists">
        <h2>All Expired Heists</h2>
        <ul>
          {expiredHeists.map((heist) => (
            <li key={heist.id}>{heist.title}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
