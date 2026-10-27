"use client"

import { useId, ChangeEvent } from "react"

interface FileInputProps {
  onChange: (file: File | null) => void
  fileName?: string
  accept?: string
  error?: string
}

export const FileInput = ({ onChange, fileName, accept = "application/pdf", error }: FileInputProps) => {
  const inputId = useId()

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.files?.[0] ?? null)
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        accept={accept}
        className="hidden"
        id={inputId}
        onChange={handleChange}
      />
      <label
        htmlFor={inputId}
        className="flex items-center justify-center gap-2 border border-dashed border-neutral-300 px-4 py-3 text-sm cursor-pointer hover:border-black transition-colors"
      >
        {fileName || "Выбрать файл"}
      </label>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
