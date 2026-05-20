import api from "./client"
import { ConfirmSignaturePayload } from "@/types"

export const getContractUrl = async (token: string): Promise<{ url: string }> => {
  const { data } = await api.get<{ url: string }>(`/sign/${token}/`)
  return data
}

export const requestSmsCode = async (token: string): Promise<{ detail: string }> => {
  const { data } = await api.post<{ detail: string }>(`/sign/${token}/request-code/`)
  return data
}

export const confirmSignature = async (
  token: string,
  payload: ConfirmSignaturePayload
): Promise<{ detail: string }> => {
  const { data } = await api.post<{ detail: string }>(
    `/sign/${token}/confirm/`,
    payload
  )
  return data
}