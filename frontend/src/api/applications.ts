import api from "./client";
import {
  Application,
  ApplicationItem,
  CreateApplicationPayload,
  ApproveApplicationPayload,
  RejectApplicationPayload,
  UpdateItemPayload,
} from "@/types";

export const createApplication = async (
  payload: CreateApplicationPayload,
): Promise<{ detail: string }> => {
  const formData = new FormData();

  formData.append("format", payload.format);
  formData.append("phone", payload.phone);
  if (payload.email) formData.append("email", payload.email);
  if (payload.trade_in_item_url) formData.append("trade_in_item_url", payload.trade_in_item_url);
  if (payload.trade_in_certificate_amount != null)
    formData.append("trade_in_certificate_amount", String(payload.trade_in_certificate_amount));

  const itemsMeta = payload.items.map((item) => ({
    brand: item.brand,
    model: item.model ?? "",
    size: item.size ?? "",
    condition: item.condition,
    defects_description: item.defects_description ?? "",
    desired_price: item.desired_price,
  }));
  formData.append("items_data", JSON.stringify(itemsMeta));

  payload.items.forEach((item, i) => {
    item.photos.forEach((photo) => {
      formData.append(`items_photos_${i}`, photo);
    });
  });

  const { data } = await api.post<{ detail: string }>(
    "/applications/",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
};

export const getApplications = async (params?: {
  status?: string;
  deal_format?: string;
  date_from?: string;
  date_to?: string;
}): Promise<Application[]> => {
  const { data } = await api.get<Application[]>("/admin/applications/", {
    params,
  });
  return data;
};

export const getApplication = async (id: string): Promise<Application> => {
  const { data } = await api.get<Application>(`/admin/applications/${id}/`);
  return data;
};

export const deleteApplication = async (id: string): Promise<void> => {
  await api.delete(`/admin/applications/${id}/`);
};

export const approveApplication = async (
  id: string,
  payload: ApproveApplicationPayload,
): Promise<{ detail: string }> => {
  const { data } = await api.post<{ detail: string }>(
    `/admin/applications/${id}/approve/`,
    payload,
  );
  return data;
};

export const sendAct = async (
  id: string,
  act_type: string,
): Promise<{ detail: string; sign_token: string }> => {
  const { data } = await api.post<{ detail: string; sign_token: string }>(
    `/admin/applications/${id}/send-act/`,
    { act_type },
  );
  return data;
};

export const rejectApplication = async (
  id: string,
  payload: RejectApplicationPayload,
): Promise<{ detail: string }> => {
  const { data } = await api.post<{ detail: string }>(
    `/admin/applications/${id}/reject/`,
    payload,
  );
  return data;
};

export const getAdminContractUrl = async (
  id: string,
): Promise<{ url: string }> => {
  const { data } = await api.get<{ url: string }>(
    `/admin/applications/${id}/contract/`,
  );
  return data;
};

export const updateApplicationItem = async (
  applicationId: string,
  itemId: string,
  payload: UpdateItemPayload,
): Promise<ApplicationItem> => {
  const { data } = await api.patch<ApplicationItem>(
    `/admin/applications/${applicationId}/items/${itemId}/`,
    payload,
  );
  return data;
};
