import Link from "next/link"
import { Clock8, Target, Users } from "lucide-react"
import styles from "./page.module.css"

export default function Home() {
  return (
    <div className="center-content">
      <div className="page-content">
        <div className={styles.hero}>
          <h1 className={styles.wordmark}>
            P<Clock8 className="logo" strokeWidth={2.75} />
            cket Heist
          </h1>
          <div className={styles.tagline}>Tiny heists. Big trouble.</div>
          <span className={styles.stamp}>
            <span className={styles.stampDot} />
            Case File — Status: Open
          </span>
        </div>

        <div className={styles.copy}>
          <p>
            Welcome to Pocket Heist, where the breakroom is your vault and the
            stapler is fair game. Rally your crew, plan the perfect caper, and
            pull off tiny office missions before the clock runs out.
          </p>
          <p>
            Whether you&apos;re swiping the last good pen or reorganizing your
            coworker&apos;s desk, every heist counts. Sign up to join the
            mischief, or log in if you&apos;re already in the crew.
          </p>
        </div>

        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepHead}>
              <Target size={16} strokeWidth={1.67} />
              01 — Target
            </div>
            <div className={styles.stepTitle}>Pick your mark</div>
            <p className={styles.stepText}>
              Every heist starts with a target: the stapler, the good mug, the
              desk by the window.
            </p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepHead}>
              <Users size={16} strokeWidth={1.67} />
              02 — Crew
            </div>
            <div className={styles.stepTitle}>Recruit your crew</div>
            <p className={styles.stepText}>
              No lone wolves. Heists need accomplices, lookouts, and someone
              with a solid alibi.
            </p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepHead}>
              <Clock8 size={16} strokeWidth={1.67} />
              03 — Clock
            </div>
            <div className={styles.stepTitle}>Beat the clock</div>
            <p className={styles.stepText}>
              Pull it off before time&apos;s up, or the mission&apos;s blown.
            </p>
          </div>
        </div>

        <div className={styles.ctaRow}>
          <Link href="/signup" className="btn">
            Start Your First Heist
          </Link>
          <Link href="/login" className={styles.secondary}>
            Already recruited? Log in
          </Link>
        </div>
      </div>
    </div>
  )
}
