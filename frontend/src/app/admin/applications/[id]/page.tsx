"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useForm, SubmitHandler, Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  getApplication,
  approveApplication,
  rejectApplication,
  sendAct,
  updateApplicationItem,
  deleteApplication,
} from "@/api"
import { Application, ApplicationCondition, ApplicationFormat, ApplicationItem, ApplicationStatus } from "@/types"
import { Button, Input, Modal, Select, StatusBadge, Textarea } from "@/components/ui"
import { PhotoGallery, PageLoader, ErrorMessage } from "@/components/shared"
import {
  FORMAT_LABELS,
  CONDITION_LABELS,
  AVAILABLE_ACTS,
  formatPrice,
  formatDateTime,
  formatPhone,
  getApiError,
  calcCommissionBreakdown,
} from "@/utils"

const CONDITION_OPTIONS = Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label }))
const FORMAT_OPTIONS = Object.entries(FORMAT_LABELS).map(([value, label]) => ({ value, label }))

const rejectSchema = z.object({
  rejection_reason: z.string().min(1, "Укажите причину"),
})

type RejectForm = z.infer<typeof rejectSchema>

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [application, setApplication] = useState<Application | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({})
  const [approveFormat, setApproveFormat] = useState<ApplicationFormat | "">("")
  const [isSendingAct, setIsSendingAct] = useState(false)
  const [editingItem, setEditingItem] = useState<ApplicationItem | null>(null)
  const [editFields, setEditFields] = useState<Record<string, string>>({})
  const [isEditLoading, setIsEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

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
    if (!approveFormat) {
      setActionError("Выберите формат сотрудничества")
      return
    }
    const items = application.items
      .filter((item) => Number(itemPrices[item.id]) > 0)
      .map((item) => ({
        id: item.id,
        offered_price: Number(itemPrices[item.id]),
      }))
    if (items.length === 0) {
      setActionError("Укажите сумму хотя бы для одного изделия")
      return
    }
    try {
      await approveApplication(id, { format: approveFormat, items })
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

  const handleDelete = async () => {
    setActionError(null)
    setIsDeleting(true)
    try {
      await deleteApplication(id)
      router.push("/admin/applications")
    } catch (e: unknown) {
      setActionError(getApiError(e, "Ошибка при удалении заявки"))
      setIsDeleting(false)
      setIsDeleteOpen(false)
    }
  }

  if (isLoading) return <PageLoader />
  if (error || !application) return <ErrorMessage message={error ?? "Ошибка"} />

  const canEdit = [
    ApplicationStatus.NEW,
    ApplicationStatus.OFFER_SENT,
    ApplicationStatus.ACCEPTED,
  ].includes(application.status)

  const openEdit = (item: ApplicationItem) => {
    setEditingItem(item)
    setEditError(null)
    setEditFields({
      brand: item.brand,
      model: item.model ?? "",
      size: item.size ?? "",
      condition: item.condition,
      defects_description: item.defects_description ?? "",
    })
  }

  const handleEditSave = async () => {
    if (!editingItem) return
    setEditError(null)
    setIsEditLoading(true)
    try {
      await updateApplicationItem(id, editingItem.id, {
        brand: editFields.brand,
        model: editFields.model,
        size: editFields.size,
        condition: editFields.condition as ApplicationCondition,
        defects_description: editFields.defects_description,
      })
      setEditingItem(null)
      await fetchApplication()
    } catch (e: unknown) {
      setEditError(getApiError(e))
    } finally {
      setIsEditLoading(false)
    }
  }

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
            {application.items.length === 0 ? (
              "Без изделий"
            ) : (
              <>
                {application.items[0].brand}
                {application.items[0].model ? ` ${application.items[0].model}` : ""}
                {application.items.length > 1 && (
                  <span className="ml-2 text-base font-normal text-neutral-500">
                    +{application.items.length - 1} изд.
                  </span>
                )}
              </>
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
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-medium">
                  Изделие {idx + 1}: {item.brand}{item.model ? ` ${item.model}` : ""}
                </h2>
                {canEdit && (
                  <Button variant="secondary" onClick={() => openEdit(item)}>
                    Редактировать
                  </Button>
                )}
              </div>
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

          {/* Trade-in предпочтение */}
          {application.format === ApplicationFormat.TRADE_IN && (application.trade_in_item_url || application.trade_in_certificate_amount) && (
            <div className="flex flex-col gap-3 border border-neutral-200 p-5">
              <h2 className="font-medium">Что хочет получить взамен</h2>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                {application.trade_in_item_url ? (
                  <>
                    <span className="text-neutral-500">Ссылка на изделие</span>
                    <a href={application.trade_in_item_url} target="_blank" rel="noopener noreferrer" className="underline break-all">
                      {application.trade_in_item_url}
                    </a>
                  </>
                ) : (
                  <>
                    <span className="text-neutral-500">Сертификат на сумму</span>
                    <span>{formatPrice(Number(application.trade_in_certificate_amount))}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Действия */}
          {actionError && <ErrorMessage message={actionError} />}

          <div className="flex flex-col gap-3">
            {canApproveOrReject && (
              <>
                <Button onClick={() => { setApproveFormat(application.format); setIsApproveOpen(true) }} fullWidth>
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

            <div className="border-t border-neutral-200 pt-3">
              <Button
                variant="danger"
                onClick={() => setIsDeleteOpen(true)}
                fullWidth
              >
                Удалить заявку
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Модалка удаления */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Удалить заявку"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-600">
            Заявка будет удалена безвозвратно вместе со всеми фото и документами.
            Продолжить?
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsDeleteOpen(false)}
              fullWidth
            >
              Отмена
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isDeleting}
              fullWidth
            >
              Удалить
            </Button>
          </div>
        </div>
      </Modal>

      {/* Модалка одобрения */}
      <Modal
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        title="Одобрить заявку"
      >
        <div className="flex flex-col gap-4">
          <Select
            label="Формат сотрудничества"
            options={FORMAT_OPTIONS}
            value={approveFormat}
            onChange={(e) => setApproveFormat(e.target.value as ApplicationFormat)}
            required
          />
          <p className="text-sm text-neutral-500">
            {approveFormat === ApplicationFormat.COMMISSION
              ? "Укажите сумму продажи — покупатель увидит разбивку с вычетом НДС и комиссии"
              : approveFormat === ApplicationFormat.TRADE_IN
              ? "Укажите сумму депозита в магазине"
              : "Оставьте поле пустым чтобы исключить изделие из предложения"}
          </p>
          {application.items.map((item) => {
            const price = Number(itemPrices[item.id]) || 0
            const priceLabel =
              approveFormat === ApplicationFormat.COMMISSION
                ? "Сумма продажи (₽)"
                : approveFormat === ApplicationFormat.TRADE_IN
                ? "Сумма депозита (₽)"
                : "Сумма выкупа (₽)"
            return (
              <div key={item.id} className="flex flex-col gap-2">
                <Input
                  label={`${item.brand}${item.model ? ` ${item.model}` : ""} — ${priceLabel}`}
                  type="number"
                  placeholder="Не включать"
                  value={itemPrices[item.id] ?? ""}
                  onChange={(e) =>
                    setItemPrices((prev) => ({ ...prev, [item.id]: e.target.value }))
                  }
                />
                {approveFormat === ApplicationFormat.COMMISSION && price >= 5000 && (() => {
                  const { vat, commissionRate, commission, sellerGets } = calcCommissionBreakdown(price)
                  return (
                    <div className="text-sm flex flex-col gap-1 bg-neutral-50 p-3 border border-neutral-200">
                      <div className="flex justify-between text-neutral-500">
                        <span>− НДС 5%</span>
                        <span>− {formatPrice(vat)}</span>
                      </div>
                      <div className="flex justify-between text-neutral-500">
                        <span>− Комиссия ex-bags ({commissionRate * 100}%)</span>
                        <span>− {formatPrice(commission)}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t border-neutral-200 pt-1 mt-1">
                        <span>Продавец получит</span>
                        <span>{formatPrice(sellerGets)}</span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )
          })}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsApproveOpen(false)} fullWidth>
              Отмена
            </Button>
            <Button onClick={handleApprove} fullWidth>
              Одобрить
            </Button>
          </div>
        </div>
      </Modal>

      {/* Модалка редактирования изделия */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="Редактировать изделие"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Бренд"
            value={editFields.brand ?? ""}
            onChange={(e) => setEditFields((p) => ({ ...p, brand: e.target.value }))}
            required
          />
          <Input
            label="Модель"
            value={editFields.model ?? ""}
            onChange={(e) => setEditFields((p) => ({ ...p, model: e.target.value }))}
          />
          <Input
            label="Размер"
            value={editFields.size ?? ""}
            onChange={(e) => setEditFields((p) => ({ ...p, size: e.target.value }))}
          />
          <Select
            label="Состояние"
            options={CONDITION_OPTIONS}
            value={editFields.condition ?? ""}
            onChange={(e) => setEditFields((p) => ({ ...p, condition: e.target.value }))}
          />
          <Textarea
            label="Изъяны"
            value={editFields.defects_description ?? ""}
            onChange={(e) => setEditFields((p) => ({ ...p, defects_description: e.target.value }))}
            rows={3}
          />
{editError && <p className="text-sm text-red-500">{editError}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setEditingItem(null)} fullWidth>
              Отмена
            </Button>
            <Button onClick={handleEditSave} isLoading={isEditLoading} fullWidth>
              Сохранить
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