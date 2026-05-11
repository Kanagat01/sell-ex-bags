import { ApplicationFormat } from "./application";

export interface Offer {
  brand: string;
  model?: string;
  format: ApplicationFormat;
  offered_price: string;
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
