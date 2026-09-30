import api from "./client"
import { ApplicationFormat, Offer, PersonalDataPayload } from "@/types"

export const getPersonalDataPrefill = async (
  token: string
): Promise<Partial<PersonalDataPayload>> => {
  const { data } = await api.get<Partial<PersonalDataPayload>>(`/offer/${token}/personal-data/`)
  return data
}

export const getOffer = async (token: string): Promise<Offer> => {
  const { data } = await api.get<Offer>(`/offer/${token}/`)
  return data
}

export const acceptOffer = async (
  token: string,
  format?: ApplicationFormat
): Promise<{ detail: string }> => {
  const { data } = await api.post<{ detail: string }>(`/offer/${token}/accept/`, { format })
  return data
}

export const declineOffer = async (token: string): Promise<{ detail: string }> => {
  const { data } = await api.post<{ detail: string }>(`/offer/${token}/decline/`)
  return data
}

export const submitPersonalData = async (
  token: string,
  payload: PersonalDataPayload
): Promise<{ detail: string; sign_token: string }> => {
  const { data } = await api.post<{ detail: string; sign_token: string }>(
    `/offer/${token}/personal-data/`,
    payload
  )
  return data
}