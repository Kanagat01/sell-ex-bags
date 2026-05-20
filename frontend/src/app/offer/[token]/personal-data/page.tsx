"use client"

import { useParams, useRouter } from "next/navigation"
import { useForm, SubmitHandler, Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { submitPersonalData } from "@/api"
import { PersonalDataPayload } from "@/types"
import { Button, Input, Textarea } from "@/components/ui"
import { ErrorMessage } from "@/components/shared"
import { getApiError } from "@/utils"

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
  account_number: z
    .string()
    .regex(/^\d{20}$/, "Номер счёта — 20 цифр")
    .optional()
    .or(z.literal("")),
  bank_name: z.string().optional(),
  bik: z
    .string()
    .regex(/^\d{9}$/, "БИК — 9 цифр")
    .optional()
    .or(z.literal("")),
  correspondent_account: z
    .string()
    .regex(/^\d{20}$/, "Корр. счёт — 20 цифр")
    .optional()
    .or(z.literal("")),
})

type PersonalDataForm = z.infer<typeof schema>

export default function PersonalDataPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PersonalDataForm>({
    resolver: zodResolver(schema) as Resolver<PersonalDataForm>,
  })

  const onSubmit: SubmitHandler<PersonalDataForm> = async (data) => {
    try {
      const response = await submitPersonalData(token, data as PersonalDataPayload)
      router.push(`/sign/${response.sign_token}`)
    } catch (e: unknown) {
      setError("root", { message: getApiError(e, "Ошибка при отправке данных") })
    }
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
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="font-medium">Банковские реквизиты для выплаты</h2>
          <p className="text-sm text-neutral-500 -mt-2">Для форматов Выкуп и Реализация</p>

          <Input
            label="Номер счёта"
            placeholder="40817810000000000000"
            maxLength={20}
            error={errors.account_number?.message}
            {...register("account_number")}
          />

          <Input
            label="Полное наименование банка"
            placeholder="ПАО Сбербанк"
            error={errors.bank_name?.message}
            {...register("bank_name")}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="БИК"
              placeholder="044525225"
              maxLength={9}
              error={errors.bik?.message}
              {...register("bik")}
            />

            <Input
              label="Корреспондентский счёт"
              placeholder="30101810400000000225"
              maxLength={20}
              error={errors.correspondent_account?.message}
              {...register("correspondent_account")}
            />
          </div>
        </div>

        {errors.root && <ErrorMessage message={errors.root.message ?? ""} />}

        <Button type="submit" isLoading={isSubmitting} fullWidth>
          Продолжить к договору
        </Button>
      </form>
    </div>
  )
}