import { create } from "zustand"
import { Application, ApplicationFormat } from "@/types"

interface ApplicationState {
  // Выбранный формат на главной странице
  selectedFormat: ApplicationFormat | null
  setSelectedFormat: (format: ApplicationFormat) => void

  // Префилл телефона/email из query-параметров (переход с ex-bags.ru для
  // залогиненного пользователя) — читается один раз на главной, переживает
  // переход через /application/types на /application без пробрасывания
  // параметров через каждый Link.
  prefillPhone: string
  prefillEmail: string
  setPrefill: (phone: string, email: string) => void

  // Список заявок в админке
  applications: Application[]
  setApplications: (applications: Application[]) => void

  // Текущая открытая заявка в админке
  currentApplication: Application | null
  setCurrentApplication: (application: Application | null) => void

  // Фильтры в админке
  filters: {
    status: string
    format: string
    date_from: string
    date_to: string
  }
  setFilter: (key: string, value: string) => void
  resetFilters: () => void
}

const defaultFilters = {
  status: "",
  format: "",
  date_from: "",
  date_to: "",
}

export const useApplicationStore = create<ApplicationState>((set) => ({
  selectedFormat: null,
  setSelectedFormat: (format) => set({ selectedFormat: format }),

  prefillPhone: "",
  prefillEmail: "",
  setPrefill: (phone, email) => set({ prefillPhone: phone, prefillEmail: email }),

  applications: [],
  setApplications: (applications) => set({ applications }),

  currentApplication: null,
  setCurrentApplication: (application) => set({ currentApplication: application }),

  filters: defaultFilters,
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),
  resetFilters: () => set({ filters: defaultFilters }),
}))