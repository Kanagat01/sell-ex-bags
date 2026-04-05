"use client"

import { useParams, useRouter } from "next/navigation"
import { useForm, SubmitHandler, Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { submitPersonalData } from "@/api"
import { PersonalDataPayload } from "@/types"
import { Button, Input, Textarea } from "@/components/ui"
import { ErrorMessage } from "@/components/shared"

const schema = z.object({
  full_name: z.string().min(1, "Укажите ФИО"),
  date_of_birth: z.string().min(1, "Укажите дату рождения"),
  passport_series: z
    .string()
    .regex(/^\d{4}$/, "Серия паспорта — 4 цифры"),
  passport_number: z
    .string()
    .regex(/^\d{6}$/, "Номер паспорта — 6 цифр"),
  passport_issued_by: z.string().min(1, "Укажите кем выдан паспорт"),
  passport_issued_date: z.string().min(1, "Укажите дату выдачи"),
  registration_address: z.string().min(1, "Укажите адрес регистрации"),
  inn: z
    .string()
    .regex(/^\d{12}$/, "ИНН — 12 цифр")
    .optional()
    .or(z.literal("")),
  payment_details: z.string().optional(),
})

type PersonalDataForm = z.infer<typeof schema>

export default function PersonalDataPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PersonalDataForm>({
    resolver: zodResolver(schema) as Resolver<PersonalDataForm>,
  })

  const onSubmit: SubmitHandler<PersonalDataForm> = async (data) => {
    const response = await submitPersonalData(token, data as PersonalDataPayload)
    router.push(`/sign/${response.sign_token}`)
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl px-6 py-6 mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium">Персональные данные</h1>
        <p className="text-sm text-neutral-500">
          Данные необходимы для формирования договора
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">

        <div className="flex flex-col gap-4">
          <h2 className="font-medium">Личные данные</h2>

          <Input
            label="ФИО полностью"
            placeholder="Иванов Иван Иванович"
            error={errors.full_name?.message}
            required
            {...register("full_name")}
          />

          <Input
            label="Дата рождения"
            type="date"
            error={errors.date_of_birth?.message}
            required
            {...register("date_of_birth")}
          />
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="font-medium">Паспортные данные</h2>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Серия"
              placeholder="1234"
              maxLength={4}
              error={errors.passport_series?.message}
              required
              {...register("passport_series")}
            />
            <Input
              label="Номер"
              placeholder="567890"
              maxLength={6}
              error={errors.passport_number?.message}
              required
              {...register("passport_number")}
            />
          </div>

          <Input
            label="Кем выдан"
            placeholder="Отделом УФМС России..."
            error={errors.passport_issued_by?.message}
            required
            {...register("passport_issued_by")}
          />

          <Input
            label="Дата выдачи"
            type="date"
            error={errors.passport_issued_date?.message}
            required
            {...register("passport_issued_date")}
          />

          <Textarea
            label="Адрес регистрации"
            placeholder="г. Москва, ул. Ленина, д. 1, кв. 1"
            rows={2}
            error={errors.registration_address?.message}
            required
            {...register("registration_address")}
          />
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="font-medium">Дополнительно</h2>

          <Input
            label="ИНН"
            placeholder="123456789012"
            maxLength={12}
            hint="Необязательно"
            error={errors.inn?.message}
            {...register("inn")}
          />

          <Input
            label="Реквизиты для выплаты"
            placeholder="Номер карты или расчётный счёт"
            hint="Для форматов Выкуп и Реализация"
            error={errors.payment_details?.message}
            {...register("payment_details")}
          />
        </div>

        {errors.root && <ErrorMessage message={errors.root.message ?? ""} />}

        <Button type="submit" isLoading={isSubmitting} fullWidth>
          Продолжить к договору
        </Button>
      </form>
    </div>
  )
}