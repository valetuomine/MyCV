import type { JSX, ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import Background from "../../components/Background"

export default function RouteMessage({
  children,
}: {
  children: ReactNode
}): JSX.Element {
  const navigate = useNavigate()

  return (
    <Background>
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6">
        <div className="max-w-xl text-cv-paper">
          <p>{children}</p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-4 rounded border border-cv-muted px-4 py-2 text-sm"
          >
            Home
          </button>
        </div>
      </main>
    </Background>
  )
}
