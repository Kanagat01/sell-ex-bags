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
  ITEM_TRANSFERRED = "item_transferred",
  RETURN_PROCESSED = "return_processed",
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

export interface ApplicationItem {
  id: string;
  brand: string;
  model?: string;
  size: string;
  condition: ApplicationCondition;
  defects_description: string;
  desired_price: string;
  offered_price: string | null;
  order: number;
  photos: ApplicationPhoto[];
}

export interface SignedDocument {
  document_type: string;
  label: string;
  url: string;
  is_signed: boolean;
}

export interface Application {
  id: string;
  format: ApplicationFormat;
  phone: string;
  email: string;
  status: ApplicationStatus;
  rejection_reason: string;
  items: ApplicationItem[];
  act_sent: boolean;
  signed_documents: SignedDocument[];
  trade_in_item_url: string;
  trade_in_certificate_amount: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationItemPayload {
  brand: string;
  model?: string;
  size?: string;
  condition: ApplicationCondition;
  defects_description?: string;
  desired_price: number;
  photos: File[];
}

export interface CreateApplicationPayload {
  format: ApplicationFormat;
  phone: string;
  email?: string;
  trade_in_item_url?: string;
  trade_in_certificate_amount?: number;
  items: ApplicationItemPayload[];
}

export interface ItemOfferPrice {
  id: string;
  offered_price: number;
}

export interface ApproveApplicationPayload {
  format: ApplicationFormat;
  items: ItemOfferPrice[];
}

export interface RejectApplicationPayload {
  rejection_reason: string;
}

export interface UpdateItemPayload {
  brand?: string;
  model?: string;
  size?: string;
  condition?: ApplicationCondition;
  defects_description?: string;
}
