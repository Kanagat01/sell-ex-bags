import { useRouter } from "next/navigation"
import { useForm, useFieldArray, SubmitHandler, Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useApplicationStore } from "@/store"
import { createApplication } from "@/api"
import {
  PHOTO_MAX_COUNT,
  PHOTO_MIN_COUNT,
  PHOTO_MAX_SIZE_MB,
  PHOTO_ALLOWED_TYPES,
  getApiError,
} from "@/utils"
import { ApplicationCondition, ApplicationFormat } from "@/types"

const conditionValues = Object.values(ApplicationCondition) as [string, ...string[]]

const photoSchema = z
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
  )

const itemSchema = z.object({
  brand: z.string().min(1, "Укажите бренд"),
  model: z.string().optional(),
  size: z.string().optional(),
  condition: z.enum(conditionValues, { error: "Укажите состояние" })
    .transform((val) => val as ApplicationCondition),
  defects_description: z.string().optional(),
  desired_price: z.coerce.number().positive("Укажите желаемую цену"),
  photos: photoSchema,
})

const schema = z.object({
  phone: z
    .string()
    .min(1, "Укажите телефон")
    .regex(
      /^(\+7|7|8)?[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/,
      "Неверный формат телефона"
    ),
  email: z.email("Неверный формат email").optional().or(z.literal("")),
  items: z.array(itemSchema).min(1),
  trade_in_item_url: z.string().optional(),
  trade_in_certificate_amount: z.coerce.number().positive().optional(),
})

export type ItemFormData = z.infer<typeof itemSchema>
export type ApplicationFormData = z.infer<typeof schema>

const emptyItem = (): ItemFormData => ({
  brand: "",
  model: "",
  size: "",
  condition: "" as ApplicationCondition,
  defects_description: "",
  desired_price: 0,
  photos: [],
})

export const useApplicationForm = () => {
  const router = useRouter()
  const { selectedFormat, prefillPhone, prefillEmail } = useApplicationStore()

  const form = useForm<ApplicationFormData, unknown, ApplicationFormData>({
    resolver: zodResolver(schema) as Resolver<ApplicationFormData>,
    defaultValues: {
      phone: prefillPhone,
      email: prefillEmail,
      items: [emptyItem()],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })

  const addItem = () => append(emptyItem())
  const removeItem = (index: number) => remove(index)

  const onSubmit: SubmitHandler<ApplicationFormData> = async (data) => {
    if (!selectedFormat) return

    if (selectedFormat === ApplicationFormat.TRADE_IN) {
      if (!data.trade_in_item_url && !data.trade_in_certificate_amount) {
        form.setError("trade_in_item_url", { message: "Укажите ссылку на изделие или сумму сертификата" })
        return
      }
    }

    try {
      await createApplication({
        format: selectedFormat,
        phone: data.phone,
        email: data.email ?? "",
        trade_in_item_url: data.trade_in_item_url,
        trade_in_certificate_amount: data.trade_in_certificate_amount,
        items: data.items.map((item) => ({
          brand: item.brand,
          model: item.model,
          size: item.size,
          condition: item.condition,
          defects_description: item.defects_description,
          desired_price: item.desired_price,
          photos: item.photos,
        })),
      })
      router.push("/application/success")
    } catch (e: unknown) {
      form.setError("root", { message: getApiError(e, "Ошибка при отправке заявки") })
    }
  }

  return { form, fields, addItem, removeItem, onSubmit: form.handleSubmit(onSubmit) }
}