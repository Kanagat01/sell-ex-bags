"use client"

import { useCallback, useId, DragEvent } from "react"
import { useFileUpload } from "@/hooks"
import { PHOTO_MAX_COUNT, PHOTO_MIN_COUNT } from "@/utils"

interface FileUploadProps {
  onChange: (files: File[]) => void
  error?: string
}

export const FileUpload = ({ onChange, error }: FileUploadProps) => {
  const inputId = useId()
  const { files, previews, error: uploadError, addFiles, removeFile } =
    useFileUpload({ maxFiles: PHOTO_MAX_COUNT, onChange })

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
  }

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
    },
    [addFiles]
  )

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const displayError = error || uploadError

  return (
    <div className="flex flex-col gap-3">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 p-8 cursor-pointer hover:border-black transition-colors"
      >
        <input
          type="file"
          accept="image/jpeg,image/png"
          multiple
          className="hidden"
          id={inputId}
          onChange={handleInput}
        />
        <label htmlFor={inputId} className="flex flex-col items-center gap-2 cursor-pointer">
          <span className="text-sm font-medium">Перетащите фото или нажмите для выбора</span>
          <span className="text-xs text-neutral-500">
            JPG, PNG · до 10 МБ · от {PHOTO_MIN_COUNT} до {PHOTO_MAX_COUNT} фото
          </span>
        </label>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {previews.map((src, index) => (
            <div key={index} className="relative aspect-square">
              <img
                src={src}
                alt={`Фото ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute top-1 right-1 bg-black text-white text-xs w-5 h-5 flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {displayError && (
        <span className="text-xs text-red-500">{displayError}</span>
      )}

      <span className="text-xs text-neutral-500">
        Загружено: {files.length} / {PHOTO_MAX_COUNT}
      </span>
    </div>
  )
}