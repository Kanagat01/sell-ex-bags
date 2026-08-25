"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useApplicationStore } from "@/store"
import { ApplicationFormat } from "@/types"
import { FORMAT_LABELS, FORMAT_DESCRIPTIONS } from "@/utils"

const formats = [
  ApplicationFormat.PURCHASE,
  ApplicationFormat.TRADE_IN,
  ApplicationFormat.COMMISSION,
]

export default function ApplicationTypesPage() {
  const router = useRouter()
  const { setSelectedFormat } = useApplicationStore()
  const [selected, setSelected] = useState<ApplicationFormat>(formats[0])

  const handleContinue = () => {
    setSelectedFormat(selected)
    router.push("/application")
  }

  return (
    <div className="dz-container dz-container--wide">
      <div style={{ paddingTop: 32 }}>
        <Link href="/" className="flow-back">← назад</Link>
      </div>

      <div className="at-title">
        <div className="at-title__eyebrow">[ заявка · шаг 1 из 3 ]</div>
        <h1>выберите способ продажи</h1>
      </div>

      <div className="at-banner">
        <img src="/application-types-main.png" alt="" />
      </div>

      <div className="type-grid">
        {formats.map((format, i) => {
          const isActive = selected === format
          return (
            <button
              key={format}
              className={"type-card" + (isActive ? " is-active" : "")}
              onClick={() => setSelected(format)}
            >
              <span className="type-card__n">[ 0{i + 1} · {FORMAT_LABELS[format].toLowerCase()} ]</span>
              <span className="type-card__title">{FORMAT_LABELS[format]}</span>
              <p className="type-card__body">{FORMAT_DESCRIPTIONS[format]}</p>
              <span className="type-card__pick">{isActive ? "выбрано ✓" : "выбрать →"}</span>
            </button>
          )
        })}
      </div>

      <div className="at-actions">
        <button className="btn btn--lg" onClick={handleContinue}>продолжить →</button>
      </div>

      <div style={{ height: 80 }} />
    </div>
  )
}
