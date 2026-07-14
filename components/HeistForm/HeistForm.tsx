"use client"

import { useEffect, useId, useState } from "react"
import { useRouter } from "next/navigation"
import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useUser } from "@/lib/user-context"
import {
  COLLECTIONS,
  userConverter,
  type CreateHeistInput,
  type User,
} from "@/types/firestore"
import styles from "./HeistForm.module.css"

export default function HeistForm() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const titleId = useId()
  const descriptionId = useId()
  const assigneeId = useId()
  const router = useRouter()
  const currentUser = useUser()

  useEffect(() => {
    async function loadUsers() {
      setUsersLoading(true)
      try {
        const snapshot = await getDocs(collection(db, COLLECTIONS.USERS))
        setUsers(snapshot.docs.map((doc) => userConverter.fromFirestore(doc)))
      } catch {
        setUsersError(
          "Couldn't load the list of agents to assign this heist to.",
        )
      } finally {
        setUsersLoading(false)
      }
    }

    loadUsers()
  }, [])

  const assignableUsers = users.filter((u) => u.id !== currentUser?.uid)
  const myCodename =
    users.find((u) => u.id === currentUser?.uid)?.codename ??
    currentUser?.displayName ??
    ""
  const canSubmit = Boolean(
    title.trim() &&
    description.trim() &&
    assignedTo &&
    currentUser &&
    assignableUsers.length > 0 &&
    !isSubmitting,
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSubmit || !currentUser) {
      setErrorMessage(
        "Please fill in the title, description, and choose an agent to assign this heist to.",
      )
      return
    }

    if (assignedTo === currentUser.uid) {
      setErrorMessage("You can't assign a heist to yourself.")
      return
    }

    const assignee = assignableUsers.find((u) => u.id === assignedTo)
    if (!assignee) {
      setErrorMessage(
        "Selected agent is no longer available. Please choose again.",
      )
      return
    }

    setErrorMessage(null)
    setIsSubmitting(true)

    const input: CreateHeistInput = {
      title: title.trim(),
      description: description.trim(),
      createdBy: currentUser.uid,
      createdByCodename: myCodename,
      assignedTo: assignee.id,
      assignedToCodeName: assignee.codename,
      createdAt: serverTimestamp(),
      deadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
      finalStatus: null,
    }

    try {
      await addDoc(collection(db, COLLECTIONS.HEISTS), input)
      router.push("/heists")
    } catch {
      setErrorMessage("Couldn't create the heist. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor={titleId} className={styles.label}>
          Title
        </label>
        <input
          id={titleId}
          name="title"
          type="text"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={styles.input}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor={descriptionId} className={styles.label}>
          Description
        </label>
        <textarea
          id={descriptionId}
          name="description"
          required
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className={styles.textarea}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor={assigneeId} className={styles.label}>
          Assign To
        </label>
        <select
          id={assigneeId}
          name="assignedTo"
          required
          disabled={usersLoading || assignableUsers.length === 0}
          value={assignedTo}
          onChange={(event) => setAssignedTo(event.target.value)}
          className={styles.select}
        >
          <option value="">
            {usersLoading ? "Loading agents..." : "Select an agent..."}
          </option>
          {assignableUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.codename}
            </option>
          ))}
        </select>
        {!usersLoading && assignableUsers.length === 0 && (
          <p className={styles.hint}>No other agents available yet.</p>
        )}
        {usersError && <p className={styles.hint}>{usersError}</p>}
      </div>
      <button type="submit" disabled={!canSubmit} className={styles.submit}>
        {isSubmitting ? "Creating..." : "Create Heist"}
      </button>
      {errorMessage && (
        <p role="alert" className={styles.error}>
          {errorMessage}
        </p>
      )}
    </form>
  )
}
