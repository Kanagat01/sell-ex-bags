"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getApplications } from "@/api"
import { Application, ApplicationStatus, ApplicationFormat } from "@/types"
import { useApplicationStore } from "@/store"
import { Input, Select, StatusBadge } from "@/components/ui"
import { PageLoader, ErrorMessage } from "@/components/shared"
import { FORMAT_LABELS, formatPrice, formatDateTime } from "@/utils"

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
  const { filters, setFilter, resetFilters, setApplications, applications } =
    useApplicationStore()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        <span className="text-sm text-neutral-500">{applications.length} заявок</span>
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
              {app.items[0].brand}
              {app.items[0].model ? ` ${app.items[0].model}` : ""}
              {app.items.length > 1 && (
                <span className="ml-1 font-normal text-neutral-400">
                  +{app.items.length - 1}
                </span>
              )}
            </Link>
          </td>

          <td className="py-3 border-t-[0.8px] border-b-[0.8px] border-black">
            {FORMAT_LABELS[app.format]}
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
    </div>
  )
}