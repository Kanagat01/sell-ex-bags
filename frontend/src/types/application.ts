export enum ApplicationFormat {
  PURCHASE = "purchase",
  TRADE_IN = "trade_in",
  COMMISSION = "commission",
}

export enum ApplicationStatus {
  NEW = "new",
  OFFER_SENT = "offer_sent",
  ACCEPTED = "accepted",
  DECLINED = "declined",
  CONTRACT_SIGNED = "contract_signed",
}

export enum ApplicationCondition {
  EXCELLENT = "excellent",
  GOOD = "good",
  SATISFACTORY = "satisfactory",
}

export interface ApplicationPhoto {
  id: string;
  file: string;
  order: number;
}

export interface Application {
  id: string;
  format: ApplicationFormat;
  brand: string;
  model?: string;
  size: string;
  condition: ApplicationCondition;
  defects_description: string;
  desired_price: string;
  offered_price: string | null;
  rejection_reason: string;
  phone: string;
  email: string;
  status: ApplicationStatus;
  photos: ApplicationPhoto[];
  photos_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateApplicationPayload {
  format: ApplicationFormat;
  brand: string;
  model?: string;
  size: string;
  condition: ApplicationCondition;
  defects_description?: string;
  desired_price: number;
  phone: string;
  email?: string;
  photos: File[];
}

export interface ApproveApplicationPayload {
  offered_price: number;
}

export interface RejectApplicationPayload {
  rejection_reason: string;
}
