export default function DeliverySuccessPage() {
  return (
    <div className="flex flex-col items-center gap-6 px-6 py-16 text-center max-w-md mx-auto">
      <span className="text-5xl">🚚</span>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium">Способ передачи подтверждён!</h1>
        <p className="text-neutral-500 text-sm">
          Мы получили ваш выбор и свяжемся с вами для уточнения деталей.
        </p>
      </div>
    </div>
  )
}
