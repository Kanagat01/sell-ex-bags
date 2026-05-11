import api from "./client";
import {
  Application,
  CreateApplicationPayload,
  ApproveApplicationPayload,
  RejectApplicationPayload,
} from "@/types";

export const createApplication = async (
  payload: CreateApplicationPayload,
): Promise<{ detail: string }> => {
  const formData = new FormData();

  formData.append("format", payload.format);
  formData.append("brand", payload.brand);
  if (payload.model) formData.append("model", payload.model);
  formData.append("size", payload.size);
  formData.append("condition", payload.condition);
  formData.append("desired_price", String(payload.desired_price));
  formData.append("phone", payload.phone);

  if (payload.defects_description) {
    formData.append("defects_description", payload.defects_description);
  }
  if (payload.email) {
    formData.append("email", payload.email);
  }

  payload.photos.forEach((photo) => {
    formData.append("photos", photo);
  });

  const { data } = await api.post<{ detail: string }>(
    "/applications/",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
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
