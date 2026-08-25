"use client"

import { Modal } from "@/components/ui"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useApplicationStore } from "@/store"

const steps = [
  {
    title: "Подайте заявку",
    text: "Оставьте заявку удобным вам способом: на сайте (ex)bags, в telegram bot, через менеджера клиентского сервиса.",
  },
  {
    title: "Передайте изделие в (ex)bags",
    text: "Мы пришлём курьера или примем аксессуар в бутике по адресу: Москва, Малый Козихинский 12",
  },
  {
    title: "Отслеживайте статус",
    text: "Отслеживайте статус продажи в личном кабинете на сайте (ex)bags. Мы сделам фото, добавим описание и доставим изделие покупателю.",
  },
  {
    title: "Получите выплату",
    text: "Мы оповестим о продаже изделия и переведем деньги на вашу карту",
  },
]

const brands = [
  "Nike", "Adidas", "Puma", "Reebok", "New Balance", "Under Armour",
  "Levi's", "Gucci", "Louis Vuitton", "Chanel", "Prada", "Dior",
  "Zara", "H&M", "Uniqlo", "Tommy Hilfiger", "Calvin Klein", "Ralph Lauren"
];

export default function HomePage() {
  const [comissionModal, setComissionModal] = useState(false);
  const [brandList, setBrandList] = useState(false);
  const setPrefill = useApplicationStore((s) => s.setPrefill);

  // window.location вместо useSearchParams() — тот требует Suspense-границы
  // при статической генерации (Next.js 16), а нам достаточно прочитать это
  // один раз после монтирования, серверный рендер тут ни при чём.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const phone = params.get("phone");
    const email = params.get("email");
    if (phone || email) setPrefill(phone ?? "", email ?? "");
  }, [setPrefill]);

  const benefits = [
    {
      title: "Подлинность",
      text: "Специалисты (ex)bags проводят тщательную аутентификацию каждого лота. При покупке аксессуара вы получаете карту с электронным сертификатом, подтверждающим подлинность изделия.",
    },
    {
      title: "Бережное хранение и безопасность",
      text: "Аккуратно относимся к акссесуарам на всех этапах - от подготовки до доставки. Заключаем договор и гарантируем безопасность сотрудничесва и банковских операций.",
    },
    {
      title: "Селекционный подход и экспертная оценка",
      text: <>Мы работаем с определённым <span className="underline cursor-pointer" onClick={() => setBrandList(true)}>бренд-листом</span> и помогаем установить конкурентную стоимость аксессуара, ориентируясь на индекс оценки предметов роскоши для повторной продажи, такой подход помогает продать ваше изделие в наиболее короткие сроки.</>,
    },
    {
      title: "Экономия времени и удобный сервис",
      text: "Заботиимся о вашем комфорте - примем лот для продажи в бутике (ex)bags или направим курьера, который заберет акссесуар в любое удобное время и место, возьмем предпродажную подготовку и взаимодействие с покупателем на себя. \n\nВ личном кабинете и telegram боте вы сможете отследить статус продажи. Менеджеры клиентского сервиса (ex)bags ответят на любые вопросы ежедневно с 10:00 до 22:00.",
    },
    {
      title: "Гарантия и состояние",
      text: "Все изделия проходят предпродажную подготовку в spa (ex)bags. Мы принимаем акссесуары в хорошем и отличном сотоянии, так же у нас есть категория с лотами в состоянии новых. При желании вы сможете передать сумку сразу после покупки специалистам в spa и мы вернем вам ее в безупречном виде.",
    },
  ]

  const formats = [
    {
      title: "Выкуп",
      text: "Мы согласуем условия продажи, проверим аксессуар на подлинность и выкупим в течении 48 часов по предложенной нами стоимости.",
    },
    {
      title: "Trade-In",
      text: "Мы оценим ваше изделие и предложим стоимость, которая будет являться депозитом для покупки аксессуара из ассортимента (ex)bags.",
      // link: "Подробнее",
    },
    {
      title: "Реализация",
      text: "Мы согласуем с вами стоимость изделия, проведём предпродажную подготовку и опубликуем товар на сайте (ex)bags. После того, как ваш лот будет продан, вы получите оплату на счёт.",
      note: <>*при продаже аксессуара, ранее купленного в (ex)bags, действует специальная комиссия -5% от стандартной. <span className="underline cursor-pointer" onClick={() => setComissionModal(true)}>Размер комиссии зависит от стоимости изделия.</span></>,
    },
  ]

  const mid = Math.ceil(brands.length / 2);        // середина списка
  const firstColumn = brands.slice(0, mid);
  const secondColumn = brands.slice(mid);

  return (
    <div className="flex flex-col">

      {/* Hero */}
      <section className="relative min-h-130 flex items-center overflow-hidden bg-[url('/main-bg.png')] bg-cover bg-center">
        {/* bg-[#bdbab3] md: */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 sm:px-12 py-16 grid grid-cols-1 md:grid-cols-[9fr_3fr] gap-12 items-center">
          <div className="flex flex-col gap-15">
            <h1 className="text-3xl md:text-4xl font-medium leading-tight tracking-tight">
              Подарите аксессуарам новую жизнь
            </h1>
            <p className="text-neutral-600 text-2xl leading-relaxed max-w-lg">
              Мы поможем быстро и легко освободить гардероб и найти покупателей для ваших сумок.
            </p>
            <Link
              href="/application/types"
              className={
                "inline-flex items-center justify-center " +
                "max-w-lg py-4 border border-black rounded-sm " +
                "text-[16px] uppercase tracking-widest " +
                "hover:bg-black hover:text-white transition-all duration-300"
              }
            >
              Начать продавать
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-6xl px-6 sm:px-12 mx-auto">
        {/* Форматы сотрудничества */}
        <section className="w-full my-9">
          <h2 className="text-2xl font-medium tracking-tight text-center text-black mb-10">
            Варианты сотрудничества
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {formats.map((f) => (
              <div key={f.title}
                className="flex flex-col gap-3 px-6 py-7.5 border-[0.75px] border-[#6C6C6C] rounded-[14px] hover:border-neutral-400 transition-colors group"
              >
                <span className="font-medium text-neutral-900">{f.title}</span>
                <span className="text-sm text-neutral-500 leading-relaxed">{f.text}</span>
                {f.note && (
                  <span className="text-xs text-neutral-400 leading-relaxed">{f.note}</span>
                )}
                {/* {f.link && (
                  <span className="text-sm underline cursor-pointer text-black group-hover:text-neutral-500 transition-colors mt-auto">
                    {f.link}
                  </span>
                )} */}
              </div>
            ))}
          </div>
        </section>

        {/* Преимущества */}
        <section className="w-full bg-neutral-50 mb-9">
          <h2 className="text-2xl font-medium tracking-tight text-center text-black mb-12">
            Преимущества сотрудничества
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
            <div className="flex flex-col gap-10">
              {benefits.slice(0, 3).map((b) => (
                <div key={b.title} className="flex flex-col gap-3">
                  <span className="text-sm font-medium text-black">{b.title}</span>
                  <span className="text-sm text-neutral-500 leading-relaxed whitespace-pre-line">{b.text}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-10">
              {benefits.slice(3).map((b) => (
                <div key={b.title} className="flex flex-col gap-3">
                  <span className="text-sm font-medium text-black">{b.title}</span>
                  <span className="text-sm text-neutral-500 leading-relaxed whitespace-pre-line">{b.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Этапы */}
        <section className="w-full mb-12">
          <h2 className="text-2xl font-medium tracking-tight text-center text-black mb-11">
            Этапы сотрудничества
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={s.title} className="flex flex-col gap-3 bg-[#F3F3F3] px-3.75 py-4.5 rounded-[14px]">
                <span className="text-sm font-medium text-black">{s.title}</span>
                <span className="text-sm text-neutral-500 leading-relaxed">{s.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="w-full mb-11">
          <h2 className="text-2xl font-medium tracking-tight text-center mb-10">
            Выберите удобный способ подачи заявки
          </h2>
          <div className="flex flex-col sm:flex-row flex-wrap gap-4.5 justify-center">
            <Link
              href="/application/types"
              className={
                "inline-flex items-center justify-center " +
                "border-[0.8px] border-black rounded-sm " +
                "px-3.5 py-4 text-black text-sm text-center tracking-widest " +
                "hover:bg-black hover:text-white transition-all duration-300"
              }
            >
              Оформить заявку на сайте
            </Link>
            <a
              href="https://t.me/"
              target="_blank"
              rel="noopener noreferrer"
              className={
                "inline-flex items-center justify-center " +
                "border-[0.8px] border-black rounded-sm " +
                "px-3.5 py-4 text-black text-sm text-center tracking-widest " +
                "hover:bg-black hover:text-white transition-all duration-300"
              }
            >
              Оформить заявку в Telegram-bot
            </a>
            <a
              href="https://t.me/+79623331133"
              target="_blank"
              rel="noopener noreferrer"
              className={
                "inline-flex items-center justify-center " +
                "border-[0.8px] border-black rounded-sm " +
                "px-3.5 py-4 text-black text-sm text-center tracking-widest " +
                "hover:bg-black hover:text-white transition-all duration-300"
              }
            >
              Оформить заявку через менеджера клиентского сервиса
            </a>
          </div>
        </section>
      </div>
      {/* Размер комиссии */}
      <Modal isOpen={comissionModal} onClose={() => setComissionModal(false)}>
        <h6 className="text-center text-[15px] font-medium mb-4">Размер комиссии зависит от стоимости изделия:</h6>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <tbody>
              {[
                { range: 'от 5.000 до 100.000', commission: 'комиссия 35%' },
                { range: 'от 100.001 до 400.000', commission: 'комиссия 30%' },
                { range: 'от 400.001 до 900.000', commission: 'комиссия 25%' },
                { range: 'от 900.001 до 1.300.000', commission: 'комиссия 20%' },
                { range: 'от 1.300.001 до 1.800.000', commission: 'комиссия 15%' },
                { range: 'от 1.800.001 рублей', commission: 'комиссия составит 10%' },
              ].map((item, i) => (
                <tr
                  key={i}
                  className="text-[15px] font-light border-b-[0.5px] border-neutral-500 last:border-b-0"
                >
                  <td className="p-2 text-center border-r-[0.5px] border-neutral-500 last:border-r-0">
                    {item.range}
                  </td>
                  <td className="p-2 text-center">
                    {item.commission}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
      {/* Бренд-лист */}
      <Modal isOpen={brandList} onClose={() => setBrandList(false)}>
        <h6 className="text-center text-[15px] font-medium mb-4">Бренд-лист (ex)bags</h6>
        <div className="grid grid-cols-2 gap-x-12 px-7 text-[15px] font-light">
          {/* Первая колонка */}
          <div className="flex flex-col gap-3">
            {firstColumn.map((brand, index) => (
              <span key={index}>
                {brand}
              </span>
            ))}
          </div>

          {/* Вторая колонка */}
          <div className="flex flex-col gap-3">
            {secondColumn.map((brand, index) => (
              <span key={index}>
                {brand}
              </span>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}