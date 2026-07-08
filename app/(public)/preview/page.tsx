// preview page for newly created UI components

import Avatar from "@/components/Avatar"
import Skeleton from "@/components/Skeleton"
import AuthForm from "@/components/AuthForm"

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
    </div>
  )
}
