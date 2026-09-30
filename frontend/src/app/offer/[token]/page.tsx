"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getOffer, acceptOffer, declineOffer } from "@/api"
import { ApplicationFormat, Offer, OfferOption } from "@/types"
import { Button } from "@/components/ui"
import { PageLoader, ErrorMessage } from "@/components/shared"
import { FORMAT_LABELS, formatPrice, calcCommissionBreakdown, getApiError } from "@/utils"

export default function OfferPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const [offer, setOffer] = useState<Offer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Выбранный клиентом формат (если вариантов несколько)
  const [selectedFormat, setSelectedFormat] = useState<ApplicationFormat | null>(null)

  useEffect(() => {
    getOffer(token)
      .then((data) => {
        setOffer(data)
        if (data.options.length === 1) setSelectedFormat(data.options[0].format)
      })
      .catch((e) => setError(getApiError(e, "Предложение не найдено или истекло")))
      .finally(() => setIsLoading(false))
  }, [token])

  const handleAccept = async () => {
    setIsSubmitting(true)
    try {
      await acceptOffer(token, selectedFormat ?? undefined)
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

  const isChoice = offer.options.length > 1

  return (
    <div className="flex flex-col gap-8 px-6 py-6 max-w-lg mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium">Предложение по вашей заявке</h1>
        <p className="text-sm text-neutral-500">
          {isChoice
            ? "Мы подготовили несколько вариантов — выберите подходящий"
            : FORMAT_LABELS[offer.options[0].format]}
        </p>
      </div>

      {isChoice ? (
        <div className="flex flex-col gap-3">
          {offer.options.map((option) => {
            const isSelected = selectedFormat === option.format
            return (
              <label
                key={option.format}
                className={`flex flex-col gap-4 border p-6 cursor-pointer transition-colors ${
                  isSelected ? "border-black" : "border-neutral-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="offer-format"
                    className="w-4 h-4 accent-black"
                    checked={isSelected}
                    onChange={() => setSelectedFormat(option.format)}
                  />
                  <span className="text-sm font-medium">{FORMAT_LABELS[option.format]}</span>
                </div>
                <OptionDetails option={option} offer={offer} />
              </label>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-4 border border-neutral-200 p-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-neutral-500">Формат</span>
            <span className="text-sm font-medium">{FORMAT_LABELS[offer.options[0].format]}</span>
          </div>
          <OptionDetails option={offer.options[0]} offer={offer} />
        </div>
      )}

      {error && <ErrorMessage message={error} />}

      <div className="flex flex-col gap-3">
        <Button
          onClick={handleAccept}
          isLoading={isSubmitting}
          disabled={!selectedFormat}
          fullWidth
        >
          {isChoice && !selectedFormat ? "Выберите вариант" : "Принять предложение"}
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
function OptionDetails({ option, offer }: { option: OfferOption; offer: Offer }) {
  const isCommission = option.format === ApplicationFormat.COMMISSION
  return (
    <div className="flex flex-col gap-4 border-t border-neutral-100 pt-4">
      {option.items.map((item, idx) => {
        const salePrice = Number(item.offered_price)
        const breakdown = isCommission ? calcCommissionBreakdown(salePrice) : null
        return (
          <div key={idx} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-700">
                {item.brand}{item.model ? ` ${item.model}` : ""}
              </span>
              {!isCommission && (
                <span className="text-sm font-medium">{formatPrice(salePrice)}</span>
              )}
            </div>
            {breakdown && (
              <div className="text-sm flex flex-col gap-1 bg-neutral-50 p-3 border border-neutral-200">
                <div className="flex justify-between text-neutral-500">
                  <span>Сумма продажи</span>
                  <span>{formatPrice(salePrice)}</span>
                </div>
                <div className="flex justify-between text-neutral-500">
                  <span>− НДС 5%</span>
                  <span>− {formatPrice(breakdown.vat)}</span>
                </div>
                <div className="flex justify-between text-neutral-500">
                  <span>− Комиссия ex-bags ({breakdown.commissionRate * 100}%)</span>
                  <span>− {formatPrice(breakdown.commission)}</span>
                </div>
                <div className="flex justify-between font-medium border-t border-neutral-200 pt-1 mt-1">
                  <span>Вы получите</span>
                  <span>{formatPrice(breakdown.sellerGets)}</span>
                </div>
              </div>
            )}
          </div>
        )
      })}
      {option.format === ApplicationFormat.TRADE_IN && (offer.trade_in_item_url || offer.trade_in_certificate_amount) && (
        <div className="border-t border-neutral-100 pt-3 flex flex-col gap-1 text-sm">
          {offer.trade_in_item_url ? (
            <>
              <span className="text-neutral-500">Ваше изделие для обмена:</span>
              <a href={offer.trade_in_item_url} target="_blank" rel="noopener noreferrer" className="underline break-all">
                {offer.trade_in_item_url}
              </a>
            </>
          ) : (
            <span className="text-neutral-500">
              Сертификат на сумму: <span className="text-black font-medium">{formatPrice(Number(offer.trade_in_certificate_amount))}</span>
            </span>
          )}
        </div>
      )}
      {option.items.length > 1 && !isCommission && (
        <div className="flex items-center justify-between border-t border-neutral-100 pt-2">
          <span className="text-sm text-neutral-500">Итого</span>
          <span className="text-base font-semibold">
            {formatPrice(option.items.reduce((sum, i) => sum + Number(i.offered_price), 0))}
          </span>
        </div>
      )}
    </div>
  )
}
