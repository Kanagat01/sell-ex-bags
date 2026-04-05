"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getContractUrl } from "@/api"
import { useSmsCode } from "@/hooks"
import { Button, Input } from "@/components/ui"
import { ContractViewer, PageLoader, ErrorMessage } from "@/components/shared"

export default function SignPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const [contractUrl, setContractUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [code, setCode] = useState("")

  const {
    isSent,
    isConfirmed,
    error: smsError,
    isLoading: smsLoading,
    secondsLeft,
    canResend,
    sendCode,
    confirmCode,
  } = useSmsCode(token)

  useEffect(() => {
    getContractUrl(token)
      .then((res) => setContractUrl(`${process.env.NEXT_PUBLIC_API_URL}${res.url}`))
      .catch((e) => setFetchError(e.response?.data?.detail ?? "Договор не найден"))
      .finally(() => setIsLoading(false))
  }, [token])

  useEffect(() => {
    if (isConfirmed) {
      router.push(`/sign/${token}/success`)
    }
  }, [isConfirmed, token, router])

  if (isLoading) return <PageLoader />
  if (fetchError) return <ErrorMessage message={fetchError} />

  return (
    <div className="flex flex-col gap-8 max-w-2xl px-6 py-6 mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium">Подписание договора</h1>
        <p className="text-sm text-neutral-500">
          Ознакомьтесь с договором и подпишите его с помощью SMS-кода
        </p>
      </div>

      {contractUrl && <ContractViewer url={contractUrl} />}

      <div className="flex flex-col gap-4 border border-neutral-200 p-6">
        <h2 className="font-medium">Подписать договор</h2>

        {!isSent ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-neutral-500">
              Нажмите кнопку — мы отправим SMS-код на ваш номер телефона
            </p>
            <Button
              onClick={sendCode}
              isLoading={smsLoading}
              fullWidth
            >
              Получить SMS-код
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-neutral-500">
              Код отправлен на ваш номер телефона
            </p>

            <Input
              label="Введите код из SMS"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />

            <Button
              onClick={() => confirmCode(code)}
              isLoading={smsLoading}
              disabled={code.length !== 6}
              fullWidth
            >
              Подписать договор
            </Button>

            <div className="flex items-center justify-between text-sm text-neutral-500">
              {secondsLeft > 0 ? (
                <span>Повторная отправка через {secondsLeft} сек.</span>
              ) : (
                <button
                  onClick={sendCode}
                  disabled={!canResend || smsLoading}
                  className="underline hover:text-black transition-colors disabled:opacity-50"
                >
                  Отправить повторно
                </button>
              )}
            </div>
          </div>
        )}

        {smsError && <ErrorMessage message={smsError} />}
      </div>
    </div>
  )
}