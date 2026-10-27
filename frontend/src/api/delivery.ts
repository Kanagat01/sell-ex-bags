import api from "./client"
import { DeliveryRequestDetail, SubmitDeliveryPayload } from "@/types"

export const getDeliveryRequest = async (token: string): Promise<DeliveryRequestDetail> => {
  const { data } = await api.get<DeliveryRequestDetail>(`/delivery/${token}/`)
  return data
}

export const submitDeliveryRequest = async (
  token: string,
  payload: SubmitDeliveryPayload
): Promise<{ detail: string }> => {
  const { data } = await api.post<{ detail: string }>(`/delivery/${token}/submit/`, payload)
  return data
}
