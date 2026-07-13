import {
  DocumentData,
  FieldValue,
  QueryDocumentSnapshot,
} from "firebase/firestore"

export type HeistStatus = "success" | "failure"

// Document — what you read from Firestore (after conversion)
export interface Heist {
  id: string
  title: string
  description: string
  createdBy: string
  createdByCodename: string
  assignedTo: string
  assignedToCodeName: string
  createdAt: Date
  deadline: Date
  finalStatus: HeistStatus | null
}

// Create Input — what you pass to addDoc
export interface CreateHeistInput {
  title: string
  description: string
  createdBy: string
  createdByCodename: string
  assignedTo: string
  assignedToCodeName: string
  createdAt: FieldValue // serverTimestamp()
  deadline: Date // set 48 hours ahead at creation time
  finalStatus: null
}

// Update Input — partial fields for updateDoc (no createdAt)
export interface UpdateHeistInput {
  title?: string
  description?: string
  assignedTo?: string
  assignedToCodeName?: string
  deadline?: Date
  finalStatus?: HeistStatus | null
}

export const heistConverter = {
  toFirestore: (data: Partial<Heist>): DocumentData => data,

  fromFirestore: (snapshot: QueryDocumentSnapshot): Heist =>
    ({
      id: snapshot.id,
      ...snapshot.data(),
      createdAt: snapshot.data().createdAt?.toDate(),
      deadline: snapshot.data().deadline?.toDate(),
    }) as Heist,
}
