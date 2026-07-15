import { useEffect, useState } from "react"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useUser } from "@/lib/user-context"
import { COLLECTIONS, heistConverter, type Heist } from "@/types/firestore"

export type HeistMode = "active" | "assigned" | "expired"

export interface UseHeistResult {
  heists: Heist[]
  loading: boolean
}

export function useHeist(mode: HeistMode): UseHeistResult {
  const currentUser = useUser()
  const uid = currentUser?.uid
  const canQuery = mode === "expired" || Boolean(uid)
  const [heists, setHeists] = useState<Heist[]>([])
  const [loading, setLoading] = useState(true)

  // Reset loading when a new subscription is about to start (mode/uid change).
  // Done during render, not inside the effect, to avoid a cascading setState-in-effect.
  const [subscriptionKey, setSubscriptionKey] = useState({ mode, uid })
  if (subscriptionKey.mode !== mode || subscriptionKey.uid !== uid) {
    setSubscriptionKey({ mode, uid })
    setLoading(true)
  }

  useEffect(() => {
    if (!canQuery) {
      return
    }

    const now = new Date()
    const heistsRef = collection(db, COLLECTIONS.HEISTS)

    const q =
      mode === "active"
        ? query(
            heistsRef,
            where("assignedTo", "==", uid),
            where("deadline", ">", now),
          )
        : mode === "assigned"
          ? query(
              heistsRef,
              where("createdBy", "==", uid),
              where("deadline", ">", now),
            )
          : query(
              heistsRef,
              where("finalStatus", "in", ["success", "failure"]),
              where("deadline", "<=", now),
            )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setHeists(snapshot.docs.map((doc) => heistConverter.fromFirestore(doc)))
        setLoading(false)
      },
      (error) => {
        console.error(error)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [mode, uid, canQuery])

  return { heists: canQuery ? heists : [], loading }
}
