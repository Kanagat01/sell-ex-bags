"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useForm, SubmitHandler, Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  getApplication,
  approveApplication,
  rejectApplication,
  sendAct,
} from "@/api"
import { Application, ApplicationStatus } from "@/types"
import { Button, Input, Modal, StatusBadge } from "@/components/ui"
import { PhotoGallery, PageLoader, ErrorMessage } from "@/components/shared"
import {
  FORMAT_LABELS,
  CONDITION_LABELS,
  AVAILABLE_ACTS,
  formatPrice,
  formatDateTime,
  formatPhone,
  getApiError,
} from "@/utils"

const rejectSchema = z.object({
  rejection_reason: z.string().min(1, "Укажите причину"),
})

type RejectForm = z.infer<typeof rejectSchema>

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()

  const [application, setApplication] = useState<Application | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({})
  const [isSendingAct, setIsSendingAct] = useState(false)

  const rejectForm = useForm<RejectForm>({
    resolver: zodResolver(rejectSchema) as Resolver<RejectForm>,
  })

  const fetchApplication = async () => {
    try {
      const data = await getApplication(id)
      setApplication(data)
    } catch {
      setError("Заявка не найдена")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchApplication()
  }, [id])

  const handleApprove = async () => {
    setActionError(null)
    if (!application) return
    const items = application.items.map((item) => ({
      id: item.id,
      offered_price: Number(itemPrices[item.id] ?? 0),
    }))
    if (items.some((i) => !i.offered_price || i.offered_price <= 0)) {
      setActionError("Укажите сумму для каждого товара")
      return
    }
    try {
      await approveApplication(id, { items })
      setIsApproveOpen(false)
      await fetchApplication()
    } catch (e: unknown) {
      setActionError(getApiError(e))
    }
  }

  const handleReject: SubmitHandler<RejectForm> = async (data) => {
    setActionError(null)
    try {
      await rejectApplication(id, data)
      setIsRejectOpen(false)
      await fetchApplication()
    } catch (e: unknown) {
      setActionError(getApiError(e))
    }
  }

  const handleSendAct = async (act_type: string) => {
    setActionError(null)
    setIsSendingAct(true)
    try {
      await sendAct(id, act_type)
      await fetchApplication()
    } catch (e: unknown) {
      setActionError(getApiError(e, "Ошибка при отправке акта"))
    } finally {
      setIsSendingAct(false)
    }
  }

  if (isLoading) return <PageLoader />
  if (error || !application) return <ErrorMessage message={error ?? "Ошибка"} />

  const canApproveOrReject = application.status === ApplicationStatus.NEW
  const canSendAcceptanceAct = application.status === ApplicationStatus.CONTRACT_SIGNED
  const canSendReturnAct =
    application.status === ApplicationStatus.ITEM_TRANSFERRED &&
    AVAILABLE_ACTS[application.format].some((a) => a.type === "return")

  return (
    <div className="flex flex-col gap-8">
      {/* Шапка */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium">
            {application.items[0].brand}
            {application.items[0].model ? ` ${application.items[0].model}` : ""}
            {application.items.length > 1 && (
              <span className="ml-2 text-base font-normal text-neutral-500">
                +{application.items.length - 1} изд.
              </span>
            )}
          </h1>
          <p className="text-sm text-neutral-500">
            {FORMAT_LABELS[application.format]} · {formatDateTime(application.created_at)}
          </p>
        </div>
        <StatusBadge status={application.status} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Левая колонка — список изделий */}
        <div className="flex flex-col gap-6">
          {application.items.map((item, idx) => (
            <div key={item.id} className="flex flex-col gap-4 border border-neutral-200 p-5">
              <h2 className="font-medium">
                Изделие {idx + 1}: {item.brand}{item.model ? ` ${item.model}` : ""}
              </h2>
              {item.photos.length > 0 && <PhotoGallery photos={item.photos} />}
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <span className="text-neutral-500">Бренд</span>
                <span>{item.brand}</span>
                {item.model && (
                  <>
                    <span className="text-neutral-500">Модель</span>
                    <span>{item.model}</span>
                  </>
                )}
                {item.size && (
                  <>
                    <span className="text-neutral-500">Размер</span>
                    <span>{item.size}</span>
                  </>
                )}
                <span className="text-neutral-500">Состояние</span>
                <span>{CONDITION_LABELS[item.condition]}</span>
                {item.defects_description && (
                  <>
                    <span className="text-neutral-500">Изъяны</span>
                    <span>{item.defects_description}</span>
                  </>
                )}
                <span className="text-neutral-500">Желаемая цена</span>
                <span>{formatPrice(item.desired_price)}</span>
                {item.offered_price && (
                  <>
                    <span className="text-neutral-500">Предложенная цена</span>
                    <span className="font-medium">{formatPrice(item.offered_price)}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Правая колонка */}
        <div className="flex flex-col gap-6">
          {/* Контакты */}
          <div className="flex flex-col gap-3 border border-neutral-200 p-5">
            <h2 className="font-medium">Контакты продавца</h2>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <span className="text-neutral-500">Телефон</span>
              <span>{formatPhone(application.phone)}</span>
              {application.email && (
                <>
                  <span className="text-neutral-500">Email</span>
                  <span>{application.email}</span>
                </>
              )}
            </div>
          </div>

          {/* Действия */}
          {actionError && <ErrorMessage message={actionError} />}

          <div className="flex flex-col gap-3">
            {canApproveOrReject && (
              <>
                <Button onClick={() => setIsApproveOpen(true)} fullWidth>
                  Одобрить заявку
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setIsRejectOpen(true)}
                  fullWidth
                >
                  Отклонить заявку
                </Button>
              </>
            )}

            {application.signed_documents.map((doc) => (
              <a
                key={doc.document_type}
                href={`${process.env.NEXT_PUBLIC_API_URL}${doc.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center border border-black px-5 py-2.5 text-sm font-medium hover:bg-neutral-100 transition-colors"
              >
                {doc.is_signed ? `Скачать подписанный: ${doc.label}` : `Предпросмотр: ${doc.label}`}
              </a>
            ))}

            {canSendAcceptanceAct && (
              application.act_sent ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-neutral-600">Ссылка на подписание Акта приёма-передачи отправлена</p>
                  <Button
                    variant="secondary"
                    onClick={() => handleSendAct("acceptance")}
                    isLoading={isSendingAct}
                    fullWidth
                  >
                    Отправить повторно
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => handleSendAct("acceptance")}
                  isLoading={isSendingAct}
                  fullWidth
                >
                  Выслать акт приёма-передачи
                </Button>
              )
            )}

            {canSendReturnAct && (
              application.act_sent ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-neutral-600">Ссылка на подписание Акта о возврате отправлена</p>
                  <Button
                    variant="secondary"
                    onClick={() => handleSendAct("return")}
                    isLoading={isSendingAct}
                    fullWidth
                  >
                    Отправить повторно
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => handleSendAct("return")}
                  isLoading={isSendingAct}
                  fullWidth
                >
                  Выслать акт о возврате
                </Button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Модалка одобрения */}
      <Modal
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        title="Одобрить заявку"
      >
        <div className="flex flex-col gap-4">
          {application.items.map((item) => (
            <Input
              key={item.id}
              label={`${item.brand}${item.model ? ` ${item.model}` : ""} — сумма (₽)`}
              type="number"
              placeholder="150000"
              value={itemPrices[item.id] ?? ""}
              onChange={(e) =>
                setItemPrices((prev) => ({ ...prev, [item.id]: e.target.value }))
              }
            />
          ))}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsApproveOpen(false)}
              fullWidth
            >
              Отмена
            </Button>
            <Button onClick={handleApprove} fullWidth>
              Одобрить
            </Button>
          </div>
        </div>
      </Modal>

      {/* Модалка отклонения */}
      <Modal
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        title="Отклонить заявку"
      >
        <form
          onSubmit={rejectForm.handleSubmit(handleReject)}
          className="flex flex-col gap-4"
        >
          <Input
            label="Причина отказа"
            placeholder="Укажите причину..."
            error={rejectForm.formState.errors.rejection_reason?.message}
            required
            {...rejectForm.register("rejection_reason")}
          />
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsRejectOpen(false)}
              fullWidth
            >
              Отмена
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={rejectForm.formState.isSubmitting}
              fullWidth
            >
              Отклонить
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}