from django import template

register = template.Library()


@register.filter
def short_fio(fullname: str):
    if not fullname:
        return ""

    parts = fullname.strip().split()
    if not parts:
        return ""

    result = parts[0]
    for p in parts[1:]:
        if p:
            result += f" {p[0]}."

    return result
