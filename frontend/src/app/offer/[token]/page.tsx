"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getOffer, acceptOffer, declineOffer } from "@/api"
import { Offer } from "@/types"
import { Button } from "@/components/ui"
import { PageLoader, ErrorMessage } from "@/components/shared"
import { FORMAT_LABELS, formatPrice, getApiError } from "@/utils"

export default function OfferPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const [offer, setOffer] = useState<Offer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getOffer(token)
      .then(setOffer)
      .catch((e) => setError(getApiError(e, "Предложение не найдено или истекло")))
      .finally(() => setIsLoading(false))
  }, [token])

  const handleAccept = async () => {
    setIsSubmitting(true)
    try {
      await acceptOffer(token)
      router.push(`/offer/${token}/personal-data`)
    } catch (e: unknown) {
      setError(getApiError(e))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDecline = async () => {
    setIsSubmitting(true)
    try {
      await declineOffer(token)
      router.push(`/offer/${token}/declined`)
    } catch (e: unknown) {
      setError(getApiError(e))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <PageLoader />
  if (error) return <ErrorMessage message={error} />
  if (!offer) return null

  return (
    <div className="flex flex-col gap-8 px-6 py-6 max-w-lg mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium">Предложение по вашей заявке</h1>
        <p className="text-sm text-neutral-500">{FORMAT_LABELS[offer.format]}</p>
      </div>

      <div className="flex flex-col gap-4 border border-neutral-200 p-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-neutral-500">Формат</span>
          <span className="text-sm font-medium">{FORMAT_LABELS[offer.format]}</span>
        </div>

        <div className="flex flex-col gap-3 border-t border-neutral-100 pt-4">
          {offer.items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span className="text-sm text-neutral-700">
                {item.brand}{item.model ? ` ${item.model}` : ""}
              </span>
              <span className="text-sm font-medium">{formatPrice(item.offered_price)}</span>
            </div>
          ))}
          {offer.items.length > 1 && (
            <div className="flex items-center justify-between border-t border-neutral-100 pt-2">
              <span className="text-sm text-neutral-500">Итого</span>
              <span className="text-base font-semibold">
                {formatPrice(
                  offer.items.reduce((sum, i) => sum + Number(i.offered_price), 0)
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="flex flex-col gap-3">
        <Button
          onClick={handleAccept}
          isLoading={isSubmitting}
          fullWidth
        >
          Принять предложение
        </Button>
        <Button
          variant="ghost"
          onClick={handleDecline}
          disabled={isSubmitting}
          fullWidth
        >
          Отказаться
        </Button>
      </div>
    </div>
  )
}