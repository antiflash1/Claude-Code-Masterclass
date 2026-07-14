"use client"

import { useHeist } from "@/lib/useHeist"

export default function HeistsPage() {
  const activeHeists = useHeist("active")
  const assignedHeists = useHeist("assigned")
  const expiredHeists = useHeist("expired")

  return (
    <div className="page-content">
      <div className="active-heists">
        <h2>Your Active Heists</h2>
        <ul>
          {activeHeists.map((heist) => (
            <li key={heist.id}>{heist.title}</li>
          ))}
        </ul>
      </div>
      <div className="assigned-heists">
        <h2>Heists You&apos;ve Assigned</h2>
        <ul>
          {assignedHeists.map((heist) => (
            <li key={heist.id}>{heist.title}</li>
          ))}
        </ul>
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
