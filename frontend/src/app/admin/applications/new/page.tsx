"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createManualApplication, searchClients } from "@/api"
import { ApplicationCondition, ClientSearchResult } from "@/types"
import { Button, Input, PhoneInput, Select, Textarea } from "@/components/ui"
import { ErrorMessage } from "@/components/shared"
import {
  BRANDS_BAGS, BRANDS_WATCHES, ITEM_CATEGORIES, CONDITION_LABELS, ItemCategory, getApiError, normalizePhone,
} from "@/utils"

const categoryOptions = Object.entries(ITEM_CATEGORIES).map(([value, label]) => ({ value, label }))
const conditionOptions = Object.values(ApplicationCondition).map((c) => ({ value: c, label: CONDITION_LABELS[c] }))

interface ItemForm {
  category: ItemCategory | ""
  brand: string
  model: string
  size: string
  condition: ApplicationCondition | ""
  defects_description: string
}

const emptyItem = (): ItemForm => ({
  category: "", brand: "", model: "", size: "", condition: "", defects_description: "",
})

export default function NewApplicationPage() {
  const router = useRouter()

  const [clientMode, setClientMode] = useState<"new" | "existing">("new")
  const [lastName, setLastName] = useState("")
  const [firstName, setFirstName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [clientQuery, setClientQuery] = useState("")
  // Результат последнего завершённого поиска и запрос, по которому он получен
  const [lastSearch, setLastSearch] = useState<{ query: string; results: ClientSearchResult[] }>({
    query: "", results: [],
  })
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null)

  const [items, setItems] = useState<ItemForm[]>([emptyItem()])
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedQuery = clientQuery.trim()
  const activeQuery =
    clientMode === "existing" && !selectedClient && trimmedQuery.length >= 2 ? trimmedQuery : ""
  const isSearchDone = !!activeQuery && lastSearch.query === activeQuery
  const clientResults = isSearchDone ? lastSearch.results : []

  useEffect(() => {
    if (!activeQuery) return
    const timeout = setTimeout(() => {
      searchClients(activeQuery)
        .then((results) => setLastSearch({ query: activeQuery, results }))
        .catch(() => setLastSearch({ query: activeQuery, results: [] }))
    }, 300)
    return () => clearTimeout(timeout)
  }, [activeQuery])

  const updateItem = (index: number, patch: Partial<ItemForm>) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))

  const handleSubmit = async () => {
    setError(null)
    if (!/^\+7\d{10}$/.test(phone)) {
      setError("Укажите телефон полностью")
      return
    }
    if (items.some((item) => !item.brand || !item.condition)) {
      setError("У каждого изделия укажите бренд и состояние")
      return
    }
    setIsSubmitting(true)
    try {
      const application = await createManualApplication({
        phone,
        email,
        ...(selectedClient
          ? { personal_data_id: selectedClient.id }
          : { last_name: lastName, first_name: firstName, middle_name: middleName }),
        items: items.map((item) => ({
          brand: item.brand,
          model: item.model,
          size: item.size,
          condition: item.condition as ApplicationCondition,
          defects_description: item.defects_description,
        })),
      })
      router.push(`/admin/applications/${application.id}`)
    } catch (e: unknown) {
      setError(getApiError(e, "Ошибка при создании заявки"))
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div className="flex flex-col gap-2">
        <Link href="/admin/applications" className="text-sm text-neutral-500 hover:text-black">
          ← К заявкам
        </Link>
        <h1 className="text-2xl font-medium">Новая заявка</h1>
      </div>

      {/* Клиент */}
      <div className="flex flex-col gap-4 border border-neutral-200 p-5">
        <h2 className="font-medium">Клиент</h2>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Фамилия" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <Input label="Имя" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input label="Отчество" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
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
            {!activeQuery ? (
              <p className="text-sm text-neutral-400">Введите хотя бы 2 символа, чтобы начать поиск</p>
            ) : !isSearchDone ? (
              <p className="text-sm text-neutral-400">Поиск...</p>
            ) : clientResults.length > 0 ? (
              <div className="flex flex-col border border-neutral-200 divide-y divide-neutral-100 max-h-60 overflow-y-auto">
                {clientResults.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => {
                      setSelectedClient(client)
                      if (client.phone) setPhone(normalizePhone(client.phone))
                    }}
                    className="flex flex-col items-start px-3 py-2 text-sm hover:bg-neutral-50 text-left"
                  >
                    <span className="font-medium">{client.full_name}</span>
                    <span className="text-neutral-500">
                      {client.phone}{client.inn ? ` · ИНН ${client.inn}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">
                Клиенты не найдены. В базе появляются только те, кто уже прошёл оформление сделки
                до конца (заполнил паспортные данные) — для нового клиента переключитесь на
                «Новый клиент».
              </p>
            )}
          </div>
        )}
      </div>

      {/* Изделия */}
      {items.map((item, index) => {
        const brandList = item.category === "bags" ? BRANDS_BAGS : item.category === "watches" ? BRANDS_WATCHES : []
        const brandOptions = brandList.map((b) => ({ value: b, label: b }))
        return (
          <div key={index} className="flex flex-col gap-4 border border-neutral-200 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Изделие {index + 1}</h2>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                  className="text-sm text-neutral-500 hover:text-red-500 transition-colors"
                >
                  Удалить
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Категория"
                placeholder="Выберите категорию"
                options={categoryOptions}
                required
                value={item.category}
                onChange={(e) => updateItem(index, { category: e.target.value as ItemCategory, brand: "" })}
              />
              <Select
                label="Бренд"
                placeholder={item.category ? "Выберите бренд" : "Сначала выберите категорию"}
                options={brandOptions}
                required
                disabled={!item.category}
                value={item.brand}
                onChange={(e) => updateItem(index, { brand: e.target.value })}
              />
              <Input
                label="Модель"
                placeholder="Например: Birkin 30, Classic Flap"
                value={item.model}
                onChange={(e) => updateItem(index, { model: e.target.value })}
              />
              <Input
                label="Размер"
                placeholder="Например: 30, M"
                value={item.size}
                onChange={(e) => updateItem(index, { size: e.target.value })}
              />
              <Select
                label="Состояние"
                placeholder="Выберите состояние"
                options={conditionOptions}
                required
                value={item.condition}
                onChange={(e) => updateItem(index, { condition: e.target.value as ApplicationCondition })}
              />
              <div className="sm:col-span-2">
                <Textarea
                  label="Описание изъянов"
                  placeholder="Потёртости, царапины, сколы фурнитуры..."
                  rows={3}
                  value={item.defects_description}
                  onChange={(e) => updateItem(index, { defects_description: e.target.value })}
                />
              </div>
            </div>
          </div>
        )
      })}

      <button
        type="button"
        onClick={() => setItems((prev) => [...prev, emptyItem()])}
        className="self-start text-sm underline text-neutral-500 hover:text-black transition-colors"
      >
        + Добавить изделие
      </button>

      {/* Контакты */}
      <div className="flex flex-col gap-4 border border-neutral-200 p-5">
        <h2 className="font-medium">Контакты</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PhoneInput label="Телефон" value={phone} onChange={setPhone} required />
          <Input
            label="Email"
            type="email"
            placeholder="client@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      <Button onClick={handleSubmit} isLoading={isSubmitting} fullWidth>
        Создать заявку
      </Button>
    </div>
  )
}
