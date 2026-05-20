export const getApiError = (
  error: unknown,
  fallback = "Произошла ошибка"
): string => {
  const e = error as { response?: { data?: { detail?: string } } }
  return e?.response?.data?.detail ?? fallback
}
