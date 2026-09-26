TOLERANCE_MM = 0.15


def judge(cyan_mm: float, magenta_mm: float, yellow_mm: float) -> tuple[str, str]:
    if (
        abs(cyan_mm) <= TOLERANCE_MM
        and abs(magenta_mm) <= TOLERANCE_MM
        and abs(yellow_mm) <= TOLERANCE_MM
    ):
        return "套准", "青品黄三色偏差都在允差内"
    return "套不准", "至少一色偏差超出允差"
