export default function SignSuccessPage() {
  return (
    <div className="flex flex-col items-center gap-6 px-6 py-16 text-center max-w-md mx-auto">
      <span className="text-5xl">🎉</span>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium">Договор подписан!</h1>
        <p className="text-neutral-500 text-sm">
          Копия договора отправлена вам на email. Мы свяжемся с вами в ближайшее время.
        </p>
      </div>
    </div>
  )
}