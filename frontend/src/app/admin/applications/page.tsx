"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getApplications, createManualApplication, searchClients } from "@/api"
import { Application, ApplicationStatus, ApplicationFormat, ClientSearchResult } from "@/types"
import { useApplicationStore } from "@/store"
import { Button, Input, Modal, PhoneInput, Select, StatusBadge, Textarea } from "@/components/ui"
import { PageLoader, ErrorMessage } from "@/components/shared"
import { FORMAT_LABELS, formatPrice, formatDateTime, getApiError } from "@/utils"

const statusOptions = [
  { value: "", label: "Все статусы" },
  { value: ApplicationStatus.NEW, label: "Новые" },
  { value: ApplicationStatus.OFFER_SENT, label: "Предложение отправлено" },
  { value: ApplicationStatus.ACCEPTED, label: "Принято" },
  { value: ApplicationStatus.DECLINED, label: "Отказано" },
  { value: ApplicationStatus.CONTRACT_SIGNED, label: "Договор подписан" },
  { value: ApplicationStatus.ITEM_TRANSFERRED, label: "Товар передан" },
  { value: ApplicationStatus.RETURN_PROCESSED, label: "Оформлен возврат" },
]

const formatOptions = [
  { value: "", label: "Все форматы" },
  { value: ApplicationFormat.PURCHASE, label: FORMAT_LABELS[ApplicationFormat.PURCHASE] },
  { value: ApplicationFormat.TRADE_IN, label: FORMAT_LABELS[ApplicationFormat.TRADE_IN] },
  { value: ApplicationFormat.COMMISSION, label: FORMAT_LABELS[ApplicationFormat.COMMISSION] },
]

export default function AdminApplicationsPage() {
  const router = useRouter()
  const { filters, setFilter, resetFilters, setApplications, applications } =
    useApplicationStore()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Ручное создание заявки
  const [isManualOpen, setIsManualOpen] = useState(false)
  const [clientMode, setClientMode] = useState<"new" | "existing">("new")
  const [manualPhone, setManualPhone] = useState("")
  const [manualDescription, setManualDescription] = useState("")
  const [manualLastName, setManualLastName] = useState("")
  const [manualFirstName, setManualFirstName] = useState("")
  const [manualMiddleName, setManualMiddleName] = useState("")
  const [clientQuery, setClientQuery] = useState("")
  const [clientResults, setClientResults] = useState<ClientSearchResult[]>([])
  const [isSearchingClients, setIsSearchingClients] = useState(false)
  const [hasSearchedClients, setHasSearchedClients] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null)
  const [isManualSubmitting, setIsManualSubmitting] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)

  useEffect(() => {
    if (clientMode !== "existing" || selectedClient || clientQuery.trim().length < 2) {
      setClientResults([])
      setHasSearchedClients(false)
      return
    }
    setIsSearchingClients(true)
    const timeout = setTimeout(() => {
      searchClients(clientQuery.trim())
        .then(setClientResults)
        .catch(() => setClientResults([]))
        .finally(() => {
          setIsSearchingClients(false)
          setHasSearchedClients(true)
        })
    }, 300)
    return () => clearTimeout(timeout)
  }, [clientQuery, clientMode, selectedClient])

  const resetManualForm = () => {
    setClientMode("new")
    setManualPhone("")
    setManualDescription("")
    setManualLastName("")
    setManualFirstName("")
    setManualMiddleName("")
    setClientQuery("")
    setClientResults([])
    setIsSearchingClients(false)
    setHasSearchedClients(false)
    setSelectedClient(null)
    setManualError(null)
  }

  const handleManualSubmit = async () => {
    setManualError(null)
    if (!manualPhone.trim()) {
      setManualError("Укажите номер телефона")
      return
    }
    if (!manualDescription.trim()) {
      setManualError("Укажите описание сумки")
      return
    }
    setIsManualSubmitting(true)
    try {
      const application = await createManualApplication({
        phone: manualPhone,
        description: manualDescription,
        ...(selectedClient
          ? { personal_data_id: selectedClient.id }
          : { last_name: manualLastName, first_name: manualFirstName, middle_name: manualMiddleName }),
      })
      setIsManualOpen(false)
      resetManualForm()
      router.push(`/admin/applications/${application.id}`)
    } catch (e: unknown) {
      setManualError(getApiError(e, "Ошибка при создании заявки"))
    } finally {
      setIsManualSubmitting(false)
    }
  }

  const fetchApplications = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getApplications({
        status: filters.status || undefined,
        deal_format: filters.format || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
      })
      setApplications(data)
    } catch {
      setError("Не удалось загрузить заявки")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [filters])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium">Заявки</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-500">{applications.length} заявок</span>
          <Button onClick={() => setIsManualOpen(true)}>Добавить заявку</Button>
        </div>
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-3 items-end">
        <Select
          label="Статус"
          options={statusOptions}
          value={filters.status}
          onChange={(e) => setFilter("status", e.target.value)}
          className="border border-neutral-200 -mb-1 ps-3 pe-8 py-2 text-sm outline-none focus:border-black"
        />

        <Select
          label="Формат"
          options={formatOptions}
          value={filters.format}
          onChange={(e) => setFilter("format", e.target.value)}
          className="border border-neutral-200 -mb-1 ps-3 pe-8 py-2 text-sm outline-none focus:border-black"
        />

        <Input
          label="С"
          type="date"
          value={filters.date_from}
          onChange={(e) => setFilter("date_from", e.target.value)}
          className="border border-neutral-200 -mb-1 px-3 py-2 text-sm outline-none focus:border-black"
        />

        <Input
          label="По"
          type="date"
          value={filters.date_to}
          onChange={(e) => setFilter("date_to", e.target.value)}
          className="border border-neutral-200 -mb-1 px-3 py-2 text-sm outline-none focus:border-black"
        />

        <button
          onClick={resetFilters}
          className="text-sm text-neutral-500 underline hover:text-black transition-colors pb-3"
        >
          Сбросить
        </button>
      </div>

      {error && <ErrorMessage message={error} />}

      {isLoading ? (
        <PageLoader />
      ) : applications.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-neutral-400 text-sm">
          Заявок не найдено
        </div>
      ) : (
        <div className="overflow-x-auto">
  <table className="w-full min-w-225 border-separate border-spacing-y-4 text-sm">
    <thead>
      <tr className="text-center text-black text-lg">
        <th className="ps-5 pb-4 pr-4 font-medium text-left">Товар</th>
        <th className="pb-4 pr-4 font-medium">Формат</th>
        <th className="pb-4 pr-4 font-medium">Телефон</th>
        <th className="pb-4 pr-4 font-medium">Желаемая цена</th>
        <th className="pb-4 pr-4 font-medium">Предложена</th>
        <th className="pb-4 pr-4 font-medium">Статус</th>
        <th className="pb-4 font-medium">Дата</th>
      </tr>
    </thead>

    <tbody>
      {applications.map((app: Application) => (
        <tr key={app.id} className="text-center text-neutral-500">
          <td className="py-3 border-t-[0.8px] border-b-[0.8px] border-black border-l-black border-l-[0.8px] rounded-l-lg ps-5 text-left">
            <Link
              href={`/admin/applications/${app.id}`}
              className="text-black font-medium hover:underline"
            >
              {app.items.length === 0 ? (
                "Без изделий"
              ) : (
                <>
                  {app.items[0].brand || app.items[0].manual_description || "Без описания"}
                  {app.items[0].brand && app.items[0].model ? ` ${app.items[0].model}` : ""}
                  {app.items.length > 1 && (
                    <span className="ml-1 font-normal text-neutral-400">
                      +{app.items.length - 1}
                    </span>
                  )}
                </>
              )}
            </Link>
          </td>

          <td className="py-3 border-t-[0.8px] border-b-[0.8px] border-black">
            {app.format ? FORMAT_LABELS[app.format] : "Формат не выбран"}
          </td>

          <td className="py-3 border-t-[0.8px] border-b-[0.8px] border-black">
            {app.phone}
          </td>

          <td className="py-3 border-t-[0.8px] border-b-[0.8px] border-black">
            {formatPrice(
              app.items.reduce((sum, i) => sum + Number(i.desired_price), 0)
            )}
          </td>

          <td className="py-3 border-t-[0.8px] border-b-[0.8px] border-black">
            {app.items.some((i) => i.offered_price)
              ? formatPrice(app.items.reduce((sum, i) => sum + Number(i.offered_price ?? 0), 0))
              : "—"}
          </td>

          <td className="py-3 border-t-[0.8px] border-b-[0.8px] border-black">
            <StatusBadge status={app.status} />
          </td>

          <td className="py-3 border-t-[0.8px] border-b-[0.8px] border-black border-r-black border-r-[0.8px] rounded-r-lg">
            {formatDateTime(app.created_at)}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
      )}

      <Modal
        isOpen={isManualOpen}
        onClose={() => { setIsManualOpen(false); resetManualForm() }}
        title="Добавить заявку"
      >
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 border-b border-neutral-200">
            {(["new", "existing"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => { setClientMode(mode); setSelectedClient(null) }}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  clientMode === mode ? "border-black text-black" : "border-transparent text-neutral-400"
                }`}
              >
                {mode === "new" ? "Новый клиент" : "Найти клиента"}
              </button>
            ))}
          </div>

          {clientMode === "new" ? (
            <div className="flex flex-col gap-3">
              <Input label="Фамилия" value={manualLastName} onChange={(e) => setManualLastName(e.target.value)} />
              <Input label="Имя" value={manualFirstName} onChange={(e) => setManualFirstName(e.target.value)} />
              <Input label="Отчество" value={manualMiddleName} onChange={(e) => setManualMiddleName(e.target.value)} />
            </div>
          ) : selectedClient ? (
            <div className="flex items-center justify-between border border-neutral-200 px-3 py-2 text-sm">
              <span>{selectedClient.full_name}{selectedClient.inn ? ` · ИНН ${selectedClient.inn}` : ""}</span>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="text-neutral-400 hover:text-black"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Input
                label="Поиск по имени, телефону или ИНН"
                placeholder="Минимум 2 символа"
                value={clientQuery}
                onChange={(e) => setClientQuery(e.target.value)}
              />
              {clientQuery.trim().length < 2 ? (
                <p className="text-sm text-neutral-400">Введите хотя бы 2 символа, чтобы начать поиск</p>
              ) : isSearchingClients ? (
                <p className="text-sm text-neutral-400">Поиск...</p>
              ) : clientResults.length > 0 ? (
                <div className="flex flex-col border border-neutral-200 divide-y divide-neutral-100 max-h-60 overflow-y-auto">
                  {clientResults.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => { setSelectedClient(client); setClientResults([]) }}
                      className="flex flex-col items-start px-3 py-2 text-sm hover:bg-neutral-50 text-left"
                    >
                      <span className="font-medium">{client.full_name}</span>
                      <span className="text-neutral-500">
                        {client.last_phone}{client.inn ? ` · ИНН ${client.inn}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              ) : hasSearchedClients ? (
                <p className="text-sm text-neutral-400">
                  Клиенты не найдены. В базе появляются только те, кто уже прошёл оформление сделки
                  до конца (заполнил паспортные данные) — для нового клиента переключитесь на
                  «Новый клиент».
                </p>
              ) : null}
            </div>
          )}

          <PhoneInput
            label="Телефон для этой заявки"
            value={manualPhone}
            onChange={setManualPhone}
            required
          />

          <Textarea
            label="Описание сумки"
            placeholder="Что хочет продать клиент"
            rows={3}
            value={manualDescription}
            onChange={(e) => setManualDescription(e.target.value)}
            required
          />

          {manualError && <ErrorMessage message={manualError} />}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setIsManualOpen(false); resetManualForm() }}
              fullWidth
            >
              Отмена
            </Button>
            <Button onClick={handleManualSubmit} isLoading={isManualSubmitting} fullWidth>
              Создать
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}