import {
  ApplicationCondition,
  ApplicationFormat,
  ApplicationStatus,
  DeliveryMethod,
} from "@/types";

export const BRANDS_BAGS = [
  "Acne Studios",
  "Alaia",
  "Alexander McQueen",
  "Alexander Wang",
  "Amina Muaddi",
  "Balenciaga",
  "Balmain",
  "Burberry",
  "Bvlgari",
  "Bottega Veneta",
  "Celine",
  "Cartier",
  "Chloe",
  "Chanel",
  "Chrome Hearts",
  "Coach",
  "Diesel",
  "Dior",
  "Dolce&Gabbana",
  "Fendi",
  "Givenchy",
  "Goyard",
  "Gucci",
  "Jacquemus",
  "Jil Sander",
  "Hermes",
  "Loewe",
  "Loro Piana",
  "Louis Vuitton",
  "Maison Margiela",
  "Marni",
  "Miu Miu",
  "Off White",
  "Prada",
  "Saint Laurent",
  "Salvatore Ferragamo",
  "Stella McCartney",
  "Telfar",
  "The Row",
  "Tom Ford",
  "Valentino Garavani",
  "Van Cleef & Arpels",
  "Versace",
  "Vivienne Westwood",
] as const;

export const BRANDS_WATCHES = [
  "A.Lange&Sohne",
  "Audemars Piguet",
  "Blancpain",
  "Breguet",
  "Breitling",
  "Chopard",
  "Graff",
  "Harry Winston",
  "Hublot",
  "IWC",
  "Jaeger-LeCoultre",
  "Longines",
  "Montblanc",
  "Officine Panerai",
  "Omega",
  "Patek Philippe",
  "Piaget",
  "Rado",
  "Richard Mille",
  "Rolex",
  "Tag Heuer",
  "Ulysse Nardin",
  "Vacheron Constantain",
  "Van Cleef&Arpels",
  "Zenith",
] as const;

export const ITEM_CATEGORIES = {
  bags: "Сумки",
  watches: "Часы и ювелирные изделия",
} as const;

export type ItemCategory = keyof typeof ITEM_CATEGORIES;

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
  [ApplicationStatus.ITEM_TRANSFERRED]: "Товар передан",
  [ApplicationStatus.RETURN_PROCESSED]: "Оформлен возврат",
};

export const AVAILABLE_ACTS: Record<ApplicationFormat, { type: string; label: string }[]> = {
  [ApplicationFormat.PURCHASE]: [
    { type: "acceptance", label: "Акт приёма-передачи" },
    { type: "return", label: "Акт возврата" },
  ],
  [ApplicationFormat.TRADE_IN]: [
    { type: "acceptance", label: "Акт приёма-передачи" },
  ],
  [ApplicationFormat.COMMISSION]: [
    { type: "acceptance", label: "Акт приёма-передачи" },
    { type: "return", label: "Акт возврата" },
  ],
};

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  [DeliveryMethod.BOUTIQUE]: "В бутике (ex)bags",
  [DeliveryMethod.COURIER_MKAD]: "Бесплатно курьером в пределах МКАД",
  [DeliveryMethod.COURIER_REGION]: "Курьером в пределах Московской области",
  [DeliveryMethod.CDEK]: "Курьерской службой СДЭК",
};

// Фиксированные бизнес-данные (не меняются из админки)
export const BOUTIQUE_ADDRESS = "г. Москва, ул. Малая Бронная, 28";
export const BOUTIQUE_HOURS = "ежедневно с 11 до 22";
export const COURIER_REGION_FEE = 500;
export const CDEK_INFO = {
  address: "ПВЗ СДЭК, г. Москва, ул. Садовая-Кудринская, 20",
  recipient: "ООО «Эксбэгс»",
  phone: "+7 962 333 11 33",
};

export const PHOTO_MIN_COUNT = 3;
export const PHOTO_MAX_COUNT = 10;
export const PHOTO_MAX_SIZE_MB = 30;
export const PHOTO_ALLOWED_TYPES = ["image/jpeg", "image/png"];
