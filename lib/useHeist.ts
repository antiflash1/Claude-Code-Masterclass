import { useEffect, useState } from "react"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useUser } from "@/lib/user-context"
import { COLLECTIONS, heistConverter, type Heist } from "@/types/firestore"

export type HeistMode = "active" | "assigned" | "expired"

export function useHeist(mode: HeistMode): Heist[] {
  const currentUser = useUser()
  const uid = currentUser?.uid
  const canQuery = mode === "expired" || Boolean(uid)
  const [heists, setHeists] = useState<Heist[]>([])

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
      },
      (error) => {
        console.error(error)
      },
    )

    return unsubscribe
  }, [mode, uid, canQuery])

  return canQuery ? heists : []
}
