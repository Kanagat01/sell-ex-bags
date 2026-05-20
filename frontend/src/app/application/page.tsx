"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useApplicationStore } from "@/store"
import { useApplicationForm } from "@/hooks"
import { Button, Input, Select, Textarea, FileUpload } from "@/components/ui"
import { ErrorMessage } from "@/components/shared"
import { FORMAT_LABELS, BRANDS_BAGS, BRANDS_WATCHES, ITEM_CATEGORIES, CONDITION_LABELS, ItemCategory } from "@/utils"
import { ApplicationCondition } from "@/types"

const categoryOptions = Object.entries(ITEM_CATEGORIES).map(([value, label]) => ({ value, label }))
const conditionOptions = Object.values(ApplicationCondition).map((c) => ({ value: c, label: CONDITION_LABELS[c] }))

export default function ApplicationPage() {
  const router = useRouter()
  const { selectedFormat } = useApplicationStore()
  const { form, fields, addItem, removeItem, onSubmit } = useApplicationForm()
  const [categories, setCategories] = useState<(ItemCategory | "")[]>([""])

  const { register, formState: { errors, isSubmitting }, setValue } = form

  useEffect(() => {
    if (!selectedFormat) router.replace("/")
  }, [selectedFormat, router])

  if (!selectedFormat) return null

  const handleCategoryChange = (index: number, value: string) => {
    setCategories((prev) => prev.map((c, i) => (i === index ? (value as ItemCategory) : c)))
    setValue(`items.${index}.brand`, "", { shouldValidate: false })
  }

  const handleAddItem = () => {
    addItem()
    setCategories((prev) => [...prev, ""])
  }

  const handleRemoveItem = (index: number) => {
    removeItem(index)
    setCategories((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12.5">
      <form onSubmit={onSubmit} className="flex flex-col gap-10">

        <h2 className="text-2xl font-medium text-center">
          Заявка на {FORMAT_LABELS[selectedFormat].toLowerCase()}
        </h2>

        {/* Изделия */}
        {fields.map((field, index) => {
          const category = categories[index] ?? ("" as ItemCategory | "")
          const brandList = category === "bags" ? BRANDS_BAGS : category === "watches" ? BRANDS_WATCHES : []
          const brandOptions = brandList.map((b) => ({ value: b, label: b }))
          const itemErrors = errors.items?.[index]

          return (
            <div key={field.id} className="flex flex-col gap-5 border border-neutral-200 p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Изделие {index + 1}</h3>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="text-sm text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    Удалить
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
                <Select
                  label="Категория"
                  placeholder="Выберите категорию"
                  options={categoryOptions}
                  required
                  value={category}
                  onChange={(e) => handleCategoryChange(index, e.target.value)}
                />

                <Select
                  label="Бренд"
                  placeholder={category ? "Выберите бренд" : "Сначала выберите категорию"}
                  options={brandOptions}
                  error={itemErrors?.brand?.message}
                  required
                  disabled={!category}
                  {...register(`items.${index}.brand`)}
                />

                <Input
                  label="Модель"
                  placeholder="Например: Birkin 30, Classic Flap"
                  error={itemErrors?.model?.message}
                  {...register(`items.${index}.model`)}
                />

                <Input
                  label="Размер"
                  placeholder="Например: 30, M"
                  error={itemErrors?.size?.message}
                  {...register(`items.${index}.size`)}
                />

                <Select
                  label="Состояние"
                  placeholder="Выберите состояние"
                  options={conditionOptions}
                  error={itemErrors?.condition?.message}
                  required
                  {...register(`items.${index}.condition`)}
                />

                <Input
                  label="Желаемая цена"
                  type="number"
                  placeholder="150000"
                  hint="В рублях"
                  error={itemErrors?.desired_price?.message}
                  required
                  {...register(`items.${index}.desired_price`)}
                />

                <div className="sm:col-span-2">
                  <Textarea
                    label="Описание изъянов"
                    placeholder="Потёртости, царапины, сколы фурнитуры..."
                    rows={3}
                    error={itemErrors?.defects_description?.message}
                    {...register(`items.${index}.defects_description`)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <FileUpload
                    onChange={(files) => setValue(`items.${index}.photos`, files, { shouldValidate: true })}
                    error={itemErrors?.photos?.message as string | undefined}
                  />
                </div>
              </div>
            </div>
          )
        })}

        <button
          type="button"
          onClick={handleAddItem}
          className="self-start text-sm underline text-neutral-500 hover:text-black transition-colors"
        >
          + Добавить изделие
        </button>

        {/* Контакты */}
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-medium text-center">Контакты</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2">
            <Input
              label="Телефон"
              type="tel"
              placeholder="+7 (999) 123-45-67"
              error={errors.phone?.message}
              required
              {...register("phone")}
            />
            <Input
              label="Email"
              type="email"
              placeholder="your@email.com"
              hint="Необязательно — для уведомлений"
              error={errors.email?.message}
              {...register("email")}
            />
          </div>
        </div>

        {errors.root && <ErrorMessage message={errors.root.message ?? ""} />}

        <Button type="submit" className="uppercase text-xs font-normal py-3" isLoading={isSubmitting} fullWidth>
          Отправить заявку
        </Button>
      </form>
    </div>
  )
}
