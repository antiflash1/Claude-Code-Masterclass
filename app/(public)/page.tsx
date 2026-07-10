import { Clock8 } from "lucide-react"

export default function Home() {
  return (
    <div className="center-content">
      <div className="page-content">
        <h1>
          P<Clock8 className="logo" strokeWidth={2.75} />
          cket Heist
        </h1>
        <div>Tiny heists. Big trouble.</div>
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
