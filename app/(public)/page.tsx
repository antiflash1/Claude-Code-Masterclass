// this page should be used only as a splash page to decide where a user should be navigated to
// when logged in --> to /heists
// when not logged in --> to /login

import { Clock8 } from "lucide-react"

export default function Home() {
  return (
    <div className="center-content">
      <div className="page-content">
        <h1>
          P<Clock8 className="logo" strokeWidth={2.75} />cket Heist
        </h1>
        <div>Tiny missions. Big office mischief.</div>
        <p>
          Welcome to Pocket Heist, where the breakroom is your vault and the
          stapler is fair game. Rally your crew, plan the perfect caper, and
          pull off tiny office missions before the clock runs out.
        </p>
        <p>
          Whether you&apos;re swiping the last good pen or reorganizing your
          coworker&apos;s desk, every heist counts. Log in to start scheming or
          sign up to join the mischief.
        </p>
      </div>
    </div>
  )
}
