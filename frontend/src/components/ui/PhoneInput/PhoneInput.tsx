import { forwardRef, ChangeEvent, FocusEvent } from "react"
import { extractPhoneDigits } from "@/utils"

interface PhoneInputProps {
  label?: string
  error?: string
  required?: boolean
  name?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
}

const PREFIX = "+7"

const formatDisplay = (digits: string): string => {
  let out = `${PREFIX} `
  if (digits.length === 0) return out
  out += `(${digits.slice(0, 3)}`
  if (digits.length >= 3) out += ")"
  if (digits.length > 3) out += ` ${digits.slice(3, 6)}`
  if (digits.length > 6) out += `-${digits.slice(6, 8)}`
  if (digits.length > 8) out += `-${digits.slice(8, 10)}`
  return out
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ label, error, required, name, value, onChange, onBlur }, ref) => {
    const display = formatDisplay(extractPhoneDigits(value))

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      onChange(PREFIX + extractPhoneDigits(e.target.value))
    }

    // Фокус в любое место поля — курсор сразу в конец, чтобы ввод
    // всегда продолжался после уже набранных цифр, а не ломал маску.
    const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
      const el = e.currentTarget
      requestAnimationFrame(() => {
        el.setSelectionRange(el.value.length, el.value.length)
      })
    }

    const base = "w-full border-[0.8px] rounded-[8px] px-3 py-2.5 text-sm outline-none transition-colors"
    const state = error ? "border-red-500 focus:border-red-500" : "border-black"

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-neutral-700 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={display}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={onBlur}
          className={`${base} ${state}`}
        />
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    )
  }
)

PhoneInput.displayName = "PhoneInput"
