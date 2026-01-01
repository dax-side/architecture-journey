"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loading } from "@/components/loading"

export default function ResultsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to home - results require a slug
    router.push("/")
  }, [router])

  return <Loading />
}
