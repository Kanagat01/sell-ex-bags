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
      n: "01 · выкуп",
      title: "Выкуп",
      text: "Мы согласуем условия продажи, проверим аксессуар на подлинность и выкупим в течении 48 часов по предложенной нами стоимости.",
    },
    {
      n: "02 · trade-in",
      title: "Trade-In",
      text: "Мы оценим ваше изделие и предложим стоимость, которая будет являться депозитом для покупки аксессуара из ассортимента (ex)bags.",
    },
    {
      n: "03 · реализация",
      title: "Реализация",
      text: "Мы согласуем с вами стоимость изделия, проведём предпродажную подготовку и опубликуем товар на сайте (ex)bags. После того, как ваш лот будет продан, вы получите оплату на счёт.",
    },
  ]

  const mid = Math.ceil(brands.length / 2);
  const firstColumn = brands.slice(0, mid);
  const secondColumn = brands.slice(mid);

  return (
    <div className="dz-container dz-container--wide">

      {/* Заголовок */}
      <div className="sell-title">
        <div>
          <div className="sell-title__eyebrow">[ продать · reload 2026 ]</div>
          <h1>Подарите аксессуарам новую жизнь.</h1>
        </div>
        <div className="sell-title__side">
          <p className="sell-title__intro">
            Поможем быстро и легко освободить гардероб и найти покупателей для ваших сумок — выкуп, trade-in или реализация на витрине (ex)bags.
          </p>
          <div className="sell-title__cta">
            <Link href="/application/types" className="btn btn--lg">начать продавать →</Link>
          </div>
        </div>
      </div>

      {/* Баннер */}
      <div className="sell-banner">
        <img src="/main-bg.png" alt="" />
      </div>

      {/* Варианты сотрудничества */}
      <div className="section-head" style={{ marginTop: 88 }}>
        <h2><span className="active">варианты сотрудничества</span> <span className="sep">/</span> <span className="dim">выберите формат</span></h2>
        <span className="section-head__meta">[ 01 · формат ]</span>
      </div>
      <div className="method-grid">
        {formats.map((f) => (
          <div key={f.title} className="method">
            <span className="method__n">{f.n}</span>
            <div className="method__title">{f.title}</div>
            <p className="method__body">{f.text}</p>
          </div>
        ))}
      </div>
      <p className="method__note">
        * при продаже аксессуара, ранее купленного в (ex)bags, действует специальная комиссия −5% от стандартной.{" "}
        <span className="underline cursor-pointer" onClick={() => setComissionModal(true)}>
          Размер комиссии зависит от стоимости изделия.
        </span>
      </p>

      {/* Преимущества */}
      <div className="section-head" style={{ marginTop: 88 }}>
        <h2><span className="active">преимущества сотрудничества</span> <span className="sep">/</span> <span className="dim">почему (ex)bags</span></h2>
        <span className="section-head__meta">[ 02 · преимущества ]</span>
      </div>
      <div className="perk-grid">
        {benefits.map((b) => (
          <div key={b.title} className="perk">
            <div className="perk__title">{b.title}</div>
            <p className="perk__body">{b.text}</p>
          </div>
        ))}
      </div>

      {/* Этапы */}
      <div className="section-head" style={{ marginTop: 88 }}>
        <h2><span className="active">этапы сотрудничества</span> <span className="sep">/</span> <span className="dim">от заявки до выплаты</span></h2>
        <span className="section-head__meta">[ 03 · процесс ]</span>
      </div>
      <div className="steps-grid">
        {steps.map((s, i) => (
          <div key={s.title} className="step">
            <span className="step__n">0{i + 1}</span>
            <div className="flex flex-col gap-2">
              <div className="step__title">{s.title}</div>
              <p className="step__body">{s.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Способы подачи заявки */}
      <div className="section-head" style={{ marginTop: 88 }}>
        <h2><span className="active">способы подачи заявки</span> <span className="sep">/</span> <span className="dim">выберите удобный</span></h2>
        <span className="section-head__meta">[ 04 · заявка ]</span>
      </div>
      <div className="channels">
        <div className="channel">
          <span className="channel__n">[ веб ]</span>
          <span className="channel__label">оформить заявку на сайте</span>
          <Link href="/application/types" className="btn">оформить →</Link>
        </div>
        <div className="channel">
          <span className="channel__n">[ telegram ]</span>
          <span className="channel__label">оформить заявку в telegram-bot</span>
          <a href="https://t.me/" target="_blank" rel="noopener noreferrer" className="btn btn--ghost">открыть →</a>
        </div>
        <div className="channel">
          <span className="channel__n">[ менеджер ]</span>
          <span className="channel__label">оформить через менеджера клиентского сервиса</span>
          <a href="https://t.me/+79623331133" target="_blank" rel="noopener noreferrer" className="btn btn--ghost">написать →</a>
        </div>
      </div>
      <div className="hours-note">клиентский сервис на связи ежедневно с 10:00 до 22:00</div>

      <div style={{ height: 24 }} />

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
          <div className="flex flex-col gap-3">
            {firstColumn.map((brand, index) => (
              <span key={index}>{brand}</span>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            {secondColumn.map((brand, index) => (
              <span key={index}>{brand}</span>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}
