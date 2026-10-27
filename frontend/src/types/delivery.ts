export enum DeliveryMethod {
  BOUTIQUE = "boutique",
  COURIER_MKAD = "courier_mkad",
  COURIER_REGION = "courier_region",
  CDEK = "cdek",
}

export interface DeliveryRequestDetail {
  is_confirmed: boolean;
  method: DeliveryMethod | "";
  address: string;
  is_expired: boolean;
}

export interface SubmitDeliveryPayload {
  method: DeliveryMethod;
  address?: string;
}
