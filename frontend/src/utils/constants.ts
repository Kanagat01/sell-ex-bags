import {
  ApplicationCondition,
  ApplicationFormat,
  ApplicationStatus,
} from "@/types";

export const BRANDS = [
  "Hermès",
  "Chanel",
  "Louis Vuitton",
  "Gucci",
  "Prada",
  "Bottega Veneta",
  "Dior",
  "Fendi",
  "Balenciaga",
  "Saint Laurent",
  "Другой",
] as const;

export const FORMAT_LABELS: Record<ApplicationFormat, string> = {
  [ApplicationFormat.PURCHASE]: "Выкуп",
  [ApplicationFormat.TRADE_IN]: "Trade-In",
  [ApplicationFormat.COMMISSION]: "Реализация",
};

export const FORMAT_DESCRIPTIONS: Record<ApplicationFormat, string> = {
  [ApplicationFormat.PURCHASE]:
    'Продажа При "выкупе" вы получаете оплату за акссесуар сразу после согласования условий и подтверждения подлинности, в случае "реализации" после продажи изделия новому владельцу.',
  [ApplicationFormat.TRADE_IN]:
    "Мы оценим ваше изделие и предложим стоимость, которая будет являться депозитом для покупки акссесуара из ассортимента (ex)bags.",
  [ApplicationFormat.COMMISSION]:
    "Сумка продаётся через площадку, вы получаете деньги после продажи",
};

export const CONDITION_LABELS: Record<ApplicationCondition, string> = {
  [ApplicationCondition.EXCELLENT]: "Отличное",
  [ApplicationCondition.GOOD]: "Хорошее",
  [ApplicationCondition.SATISFACTORY]: "Удовлетворительное",
};

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  [ApplicationStatus.NEW]: "Новая",
  [ApplicationStatus.OFFER_SENT]: "Предложение отправлено",
  [ApplicationStatus.ACCEPTED]: "Принято",
  [ApplicationStatus.DECLINED]: "Отказано",
  [ApplicationStatus.CONTRACT_SIGNED]: "Договор подписан",
};

export const PHOTO_MIN_COUNT = 3;
export const PHOTO_MAX_COUNT = 10;
export const PHOTO_MAX_SIZE_MB = 10;
export const PHOTO_ALLOWED_TYPES = ["image/jpeg", "image/png"];
