"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getDeliveryRequest, submitDeliveryRequest } from "@/api"
import { DeliveryMethod, DeliveryRequestDetail } from "@/types"
import { Button, Textarea } from "@/components/ui"
import { PageLoader, ErrorMessage } from "@/components/shared"
import {
  DELIVERY_METHOD_LABELS,
  BOUTIQUE_ADDRESS,
  BOUTIQUE_HOURS,
  COURIER_REGION_FEE,
  CDEK_INFO,
  formatPrice,
  getApiError,
} from "@/utils"

const NEEDS_ADDRESS = [DeliveryMethod.COURIER_MKAD, DeliveryMethod.COURIER_REGION]

export default function DeliveryPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const [data, setData] = useState<DeliveryRequestDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [method, setMethod] = useState<DeliveryMethod | null>(null)
  const [address, setAddress] = useState("")

  useEffect(() => {
    getDeliveryRequest(token)
      .then(setData)
      .catch((e) => setError(getApiError(e, "Ссылка не найдена или истекла")))
      .finally(() => setIsLoading(false))
  }, [token])

  const handleSubmit = async () => {
    if (!method) return
    if (NEEDS_ADDRESS.includes(method) && !address.trim()) {
      setError("Укажите адрес")
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      await submitDeliveryRequest(token, { method, address: address.trim() || undefined })
      router.push(`/delivery/${token}/success`)
    } catch (e: unknown) {
      setError(getApiError(e))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <PageLoader />
  if (error && !data) return <ErrorMessage message={error} />
  if (!data) return null

  if (data.is_confirmed) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-16 text-center max-w-md mx-auto">
        <h1 className="text-2xl font-medium">Способ передачи уже выбран</h1>
        <p className="text-neutral-500 text-sm">{DELIVERY_METHOD_LABELS[data.method as DeliveryMethod]}</p>
      </div>
    )
  }

  if (data.is_expired) {
    return <ErrorMessage message="Ссылка истекла. Свяжитесь с нами, чтобы получить новую." />
  }

  return (
    <div className="flex flex-col gap-8 max-w-lg px-6 py-6 mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium">Способ передачи сумки</h1>
        <p className="text-sm text-neutral-500">Выберите, как вам удобнее передать изделие</p>
      </div>

      <div className="flex flex-col gap-3">
        {Object.values(DeliveryMethod).map((value) => {
          const isSelected = method === value
          return (
            <label
              key={value}
              className={`flex flex-col gap-3 border p-5 cursor-pointer transition-colors ${
                isSelected ? "border-black" : "border-neutral-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="delivery-method"
                  className="w-4 h-4 accent-black"
                  checked={isSelected}
                  onChange={() => setMethod(value)}
                />
                <span className="text-sm font-medium">{DELIVERY_METHOD_LABELS[value]}</span>
              </div>

              {value === DeliveryMethod.BOUTIQUE && (
                <p className="text-sm text-neutral-500 pl-7">{BOUTIQUE_ADDRESS}, {BOUTIQUE_HOURS}</p>
              )}

              {value === DeliveryMethod.CDEK && (
                <p className="text-sm text-neutral-500 pl-7">
                  {CDEK_INFO.address}<br />
                  Получатель: {CDEK_INFO.recipient}, тел. {CDEK_INFO.phone}
                </p>
              )}

              {value === DeliveryMethod.COURIER_REGION && (
                <p className="text-sm text-neutral-500 pl-7">
                  Стоимость доставки: {formatPrice(COURIER_REGION_FEE)}
                </p>
              )}

              {isSelected && NEEDS_ADDRESS.includes(value) && (
                <div className="pl-7">
                  <Textarea
                    label="Адрес"
                    placeholder="г. Москва, ул. ..., д. ..., кв. ..."
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>
              )}
            </label>
          )
        })}
      </div>

      {error && <ErrorMessage message={error} />}

      <Button onClick={handleSubmit} isLoading={isSubmitting} disabled={!method} fullWidth>
        Подтвердить
      </Button>
    </div>
  )
}
