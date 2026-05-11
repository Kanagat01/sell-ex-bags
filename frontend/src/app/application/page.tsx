"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useApplicationStore } from "@/store"
import { useApplicationForm } from "@/hooks"
import { Button, Input, Select, Textarea, FileUpload } from "@/components/ui"
import { ErrorMessage } from "@/components/shared"
import { FORMAT_LABELS, BRANDS_BAGS, BRANDS_WATCHES, ITEM_CATEGORIES, CONDITION_LABELS, ItemCategory } from "@/utils"
import { ApplicationCondition } from "@/types"

export default function ApplicationPage() {
  const router = useRouter()
  const { selectedFormat } = useApplicationStore()
  const { form, onSubmit } = useApplicationForm()
  const [category, setCategory] = useState<ItemCategory | "">("")

  const {
    register,
    formState: { errors, isSubmitting },
    setValue,
  } = form

  useEffect(() => {
    if (!selectedFormat) router.replace("/")
  }, [selectedFormat, router])

  if (!selectedFormat) return null

  const categoryOptions = Object.entries(ITEM_CATEGORIES).map(([value, label]) => ({
    value,
    label,
  }))

  const brandList = category === "bags" ? BRANDS_BAGS : category === "watches" ? BRANDS_WATCHES : []
  const brandOptions = brandList.map((b) => ({ value: b, label: b }))

  const conditionOptions = Object.values(ApplicationCondition).map((c) => ({
    value: c,
    label: CONDITION_LABELS[c],
  }))

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value as ItemCategory)
    setValue("brand", "", { shouldValidate: false })
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12.5">
      <form onSubmit={onSubmit} className="flex flex-col gap-7.5">

        {/* Данные товара */}
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-medium text-center">Информация о продаваемом товаре ({FORMAT_LABELS[selectedFormat]})</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
            <Select
              label="Категория"
              placeholder="Выберите категорию"
              options={categoryOptions}
              required
              value={category}
              onChange={handleCategoryChange}
            />

            <Select
              label="Бренд"
              placeholder={category ? "Выберите бренд" : "Сначала выберите категорию"}
              options={brandOptions}
              error={errors.brand?.message}
              required
              disabled={!category}
              {...register("brand")}
            />

            <Input
              label="Модель"
              placeholder="Например: Birkin 30, Classic Flap"
              error={errors.model?.message}
              {...register("model")}
            />

            <Input
              label="Размер"
              placeholder="Например: 30, M"
              error={errors.size?.message}
              {...register("size")}
            />

            <Select
              label="Состояние"
              placeholder="Выберите состояние"
              options={conditionOptions}
              error={errors.condition?.message}
              required
              {...register("condition")}
            />

            <Textarea
              label="Описание изъянов"
              placeholder="Потёртости, царапины, сколы фурнитуры..."
              rows={3}
              error={errors.defects_description?.message}
              {...register("defects_description")}
            />
          </div>
        </div>

        {/* Фотографии */}
        <div className="flex flex-col gap-6">
          <h2 className="text-2xl font-medium text-center">Фотографии</h2>
          <FileUpload
            onChange={(files) => setValue("photos", files, { shouldValidate: true })}
            error={errors.photos?.message}
          />
        </div>

        {/* Контакты и цена */}
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-medium text-center">Контакты и цена</h2>

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

            <Input
              label="Желаемая цена"
              type="number"
              placeholder="150000"
              hint="В рублях"
              error={errors.desired_price?.message}
              required
              {...register("desired_price")}
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
