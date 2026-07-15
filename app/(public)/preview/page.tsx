// preview page for newly created UI components

import Avatar from "@/components/Avatar"
import Skeleton from "@/components/Skeleton"
import AuthForm from "@/components/AuthForm"
import Loader from "@/components/Loader"
import HeistCard from "@/components/HeistCard"
import HeistCardSkeleton from "@/components/HeistCardSkeleton"
import type { Heist } from "@/types/firestore"

const normalHeist: Heist = {
  id: "preview-normal",
  title: "Swap the CEO's stapler for a novelty one",
  description: "",
  createdBy: "u1",
  createdByCodename: "ShadowLedgerFox",
  assignedTo: "u2",
  assignedToCodeName: "VelvetVaultRaven",
  createdAt: new Date(),
  deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
  finalStatus: null,
}

const overdueHeist: Heist = {
  id: "preview-overdue",
  title: "Relabel the break room snacks",
  description: "",
  createdBy: "u3",
  createdByCodename: "CrimsonCaperCobra",
  assignedTo: "u4",
  assignedToCodeName: "RogueScoreHawk",
  createdAt: new Date(),
  deadline: new Date(Date.now() - 1000 * 60 * 60),
  finalStatus: null,
}

export default function PreviewPage() {
  return (
    <div className="page-content">
      <h2>Preview</h2>

      <h3>Avatar</h3>
      <div className="preview-grid">
        <Avatar name="JohnDoe" />
        <Avatar name="mercury" />
      </div>

      <h3>Skeleton</h3>
      <div className="preview-grid">
        <Skeleton />
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>

      <h3>AuthForm</h3>
      <div className="preview-grid">
        <AuthForm mode="login" />
        <AuthForm mode="signup" />
      </div>

      <h3>Loader</h3>
      <div className="preview-grid">
        <Loader />
      </div>

      <h3>HeistCard</h3>
      <div className="preview-grid">
        <HeistCard heist={normalHeist} />
        <HeistCard heist={overdueHeist} />
      </div>

      <h3>HeistCardSkeleton</h3>
      <div className="preview-grid">
        <HeistCardSkeleton />
        <HeistCardSkeleton />
      </div>
    </div>
  )
}
