import { useState, useEffect, useRef } from "react"
import { requestSmsCode, confirmSignature } from "@/api"
import { getApiError } from "@/utils"

const CODE_TTL_SECONDS = 5 * 60 // 5 минут

export const useSmsCode = (token: string) => {
  const [isSent, setIsSent] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startTimer = () => {
    setSecondsLeft(CODE_TTL_SECONDS)
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const sendCode = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await requestSmsCode(token)
      setIsSent(true)
      startTimer()
    } catch (e: unknown) {
      setError(getApiError(e, "Ошибка отправки кода"))
    } finally {
      setIsLoading(false)
    }
  }

  const confirmCode = async (code: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await confirmSignature(token, { code })
      setIsConfirmed(true)
    } catch (e: unknown) {
      setError(getApiError(e, "Неверный код"))
    } finally {
      setIsLoading(false)
    }
  }

  const canResend = secondsLeft === 0 && isSent

  return {
    isSent,
    isConfirmed,
    error,
    isLoading,
    secondsLeft,
    canResend,
    sendCode,
    confirmCode,
  }
}