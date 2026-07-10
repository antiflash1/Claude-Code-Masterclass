import styles from "./Toast.module.css"

export type ToastProps = {
  message: string
}

export default function Toast({ message }: ToastProps) {
  return (
    <div className={styles.toast} role="alert">
      {message}
    </div>
  )
}
