import { ApplicationFormat } from "./application";

export interface OfferItem {
  brand: string;
  model?: string;
  offered_price: string;
}

export interface OfferOption {
  format: ApplicationFormat;
  items: OfferItem[];
}

export interface Offer {
  trade_in_item_url: string;
  trade_in_certificate_amount: string | null;
  // Один или несколько форматов — клиент выбирает один на всю заявку
  options: OfferOption[];
  expires_at: string;
}

export interface PersonalDataPayload {
  full_name: string;
  date_of_birth: string;
  passport_series: string;
  passport_number: string;
  passport_issued_by: string;
  passport_issued_date: string;
  registration_address: string;
  inn?: string;
  account_number?: string;
  bank_name?: string;
  bik?: string;
  correspondent_account?: string;
}
