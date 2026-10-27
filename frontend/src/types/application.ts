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
  condition: ApplicationCondition | "";
  defects_description: string;
  manual_description: string;
  desired_price: string | null;
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

export interface PersonalDataSummary {
  id: number;
  full_name: string;
  inn: string;
}

export interface ClosingReportInfo {
  uploaded: boolean;
  sent: boolean;
  is_signed: boolean;
  sign_token: string | null;
}

export interface DeliveryRequestInfo {
  is_confirmed: boolean;
  method: string;
  method_label: string;
  address: string;
}

export interface Application {
  id: string;
  format: ApplicationFormat | "";
  phone: string;
  email: string;
  status: ApplicationStatus;
  rejection_reason: string;
  items: ApplicationItem[];
  act_sent: boolean;
  signed_documents: SignedDocument[];
  trade_in_item_url: string;
  trade_in_certificate_amount: string | null;
  // Варианты, отправленные клиенту (пока он не выбрал один)
  offer_options: SentOfferOption[];
  last_name: string;
  first_name: string;
  middle_name: string;
  is_manual: boolean;
  personal_data: PersonalDataSummary | null;
  amendment_sent: boolean;
  closing_report: ClosingReportInfo | null;
  delivery_request: DeliveryRequestInfo | null;
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

export interface SentOfferOption {
  format: ApplicationFormat;
  items: { id: string; price: string }[];
}

export interface ApproveOfferOption {
  format: ApplicationFormat;
  items: ItemOfferPrice[];
}

export interface ApproveApplicationPayload {
  options: ApproveOfferOption[];
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
  manual_description?: string;
  desired_price?: number;
}

export interface ManualCreateApplicationPayload {
  phone: string;
  last_name?: string;
  first_name?: string;
  middle_name?: string;
  description: string;
  personal_data_id?: number;
}

export interface ClientSearchResult {
  id: number;
  full_name: string;
  date_of_birth: string;
  inn: string;
  last_phone: string;
}

export interface SendAmendmentPayload {
  items: { item_id: string; new_price: number }[];
}
