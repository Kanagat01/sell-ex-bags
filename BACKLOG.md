# Бэклог

## [bug] Заявка может создаться без изделий (items = [])

**Обнаружено:** 2026-09-17, крэш `/admin/applications` — `Cannot read properties of
undefined (reading 'brand')`. В проде нашлась заявка с `items: []`.

**Причина (подтверждена в коде):**
1. `CreateApplicationSerializer.validate_items_data`
   (`backend/apps/applications/serializers.py:46`) проверяет только, что
   `items_data` — непустой список JSON. Поля внутри каждого item (`brand`,
   `desired_price`, `condition`, ...) не валидируются.
2. `CreateApplicationSerializer.create` (`serializers.py:71`) не обёрнут в
   `@transaction.atomic`, и `ATOMIC_REQUESTS` в настройках не включён.
   `Application.objects.create(...)` коммитится сразу; если создание
   `ApplicationItem` в цикле падает (например, из-за некорректного типа
   `desired_price`), Application остаётся в БД без единого item, а клиент
   получает 500.

**Временный фикс (сделан):** фронт больше не падает на пустом `items` —
`admin/applications/page.tsx` и `admin/applications/[id]/page.tsx` показывают
«Без изделий» вместо обращения к `items[0]`.

**Что нужно сделать по-настоящему:**
- [ ] Обернуть `CreateApplicationSerializer.create` в `@transaction.atomic`,
      чтобы при сбое создания item'а вся заявка откатывалась целиком (никаких
      «полузаявок» в БД).
- [ ] Добавить полную валидацию каждого item в `items_data` (через вложенный
      сериализатор вместо `CharField` + `json.loads`, либо явные проверки:
      `brand` обязателен, `desired_price` — валидное положительное число,
      `condition` — одно из `ApplicationCondition.choices`).
- [ ] Разовая чистка БД: найти и решить, что делать с уже существующими
      заявками с `items.count() == 0` (удалить или дозаполнить вручную).
- [ ] Рассмотреть DB-constraint (или periodic health-check), который бы не
      давал таким записям тихо накапливаться в будущем.
