import { useRouter } from "next/navigation"
import { useForm, SubmitHandler, Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useApplicationStore } from "@/store"
import { createApplication } from "@/api"
import {
  PHOTO_MAX_COUNT,
  PHOTO_MIN_COUNT,
  PHOTO_MAX_SIZE_MB,
  PHOTO_ALLOWED_TYPES,
} from "@/utils"
import { ApplicationCondition } from "@/types"

const conditionValues = Object.values(ApplicationCondition) as [string, ...string[]]

const schema = z.object({
  brand: z.string().min(1, "Укажите бренд"),
  model: z.string().optional(),
  size: z.string().optional(),
  condition: z.enum(conditionValues, {
    error: "Укажите состояние", 
  }).transform((val) => val as ApplicationCondition),
  defects_description: z.string().optional(),
  desired_price: z.coerce.number().positive("Укажите желаемую цену"),
  phone: z
    .string()
    .min(1, "Укажите телефон")
    .regex(
      /^(\+7|7|8)?[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/,
      "Неверный формат телефона"
    ),
  email: z.email("Неверный формат email").optional().or(z.literal("")),
  photos: z
    .array(z.instanceof(File))
    .min(PHOTO_MIN_COUNT, `Минимум ${PHOTO_MIN_COUNT} фото`)
    .max(PHOTO_MAX_COUNT, `Максимум ${PHOTO_MAX_COUNT} фото`)
    .refine(
      (files) => files.every((f) => PHOTO_ALLOWED_TYPES.includes(f.type)),
      "Допустимые форматы: JPG, PNG"
    )
    .refine(
      (files) => files.every((f) => f.size <= PHOTO_MAX_SIZE_MB * 1024 * 1024),
      `Максимальный размер: ${PHOTO_MAX_SIZE_MB} МБ`
    ),
})

export type ApplicationFormData = z.infer<typeof schema>

export const useApplicationForm = () => {
  const router = useRouter()
  const { selectedFormat } = useApplicationStore()

  const form =useForm<ApplicationFormData, unknown, ApplicationFormData>({
    resolver: zodResolver(schema) as Resolver<ApplicationFormData>,
    defaultValues: {
      brand: "",
      model: "",
      size: "",
      defects_description: "",
      phone: "",
      email: "",
      photos: [],
    },
  })

  const onSubmit: SubmitHandler<ApplicationFormData> = async (data) => {
    if (!selectedFormat) return

    try {
      await createApplication({
        ...data,
        format: selectedFormat,
        size: data.size ?? "",
        defects_description: data.defects_description ?? "",
        email: data.email ?? "",
      })
      router.push("/application/success")
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      form.setError("root", { message: err.response?.data?.detail ?? "Ошибка при отправке заявки" })
    }
  }

  return { form, onSubmit: form.handleSubmit(onSubmit) }
}