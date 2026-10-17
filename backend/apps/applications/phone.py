import re


def normalize_phone(phone: str) -> str | None:
    """Приводит российский номер к виду +7XXXXXXXXXX.
    Принимает «8 999 123-45-67», «+7 (999) 123-45-67», «9991234567» и т.п.
    Возвращает None, если это не похоже на номер."""
    digits = re.sub(r"\D", "", phone or "")
    if len(digits) == 11 and digits[0] in "78":
        digits = digits[1:]
    if len(digits) != 10:
        return None
    return f"+7{digits}"
