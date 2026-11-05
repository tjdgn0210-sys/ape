"""첫 화면(IntroWalk)용 퇴화 합성 프레임을 만든다.

단계 그림 5장(현대인 → 창 든 원시인 → 호미닌 → 원인 → 유인원)을 같은 바닥선·가운데에 맞춰 놓고,
이웃한 두 그림 사이를 거리장(SDF) 보간으로 STEPS칸씩 이어 만든다. 겹쳐 비치는 교차 페이드가 아니라
실루엣 모양 자체가 조금씩 바뀌는 프레임이다. 결과: assets/intro/f00.png ... (검은 실루엣, 앱에서 색을 입힘)

실행: python3 scripts/make-intro-frames.py
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "intro"
SCALE = 2.5  # pt → px
BOX_W, BOX_H = 96, 104  # IntroWalk의 BOX_WIDTH / 걷는 칸 높이(pt)
STEPS = 24  # 두 단계 사이를 몇 칸으로 나눌지(사이 프레임 = STEPS - 1). 투명도 없이 그림만 바꿔 끼우므로 촘촘해야 모양이 이어져 보인다

# (파일, 보이는 높이 pt 또는 None, 보이는 폭 pt 또는 None, 바닥에서 띄우는 pt)
STAGES = [
    ("stage-1-human.png", 96, None, 0.0),
    ("stage-2-hunter.png", 94, None, 0.0),
    ("stage-3-hominid.png", 82, None, 0.0),
    ("stage-4-ape.png", 76, None, 0.0),
    # 마지막은 네 발로 걷는 그림(RunningApe, 폭 78pt)과 같은 실루엣·크기·발 위치(그림 높이의 96.86%)
    ("stage-5-crouching-ape.png", None, 78, 78 * 700 / 740 * (1 - 0.9686)),
]


def place(name: str, height, width, lift) -> np.ndarray:
    """그림을 상자(BOX_W x BOX_H) 안 가운데·바닥에 맞춰 놓은 알파(0~1) 배열"""
    im = Image.open(ROOT / "assets" / "icons" / name).convert("RGBA")
    alpha = im.getchannel("A")
    bbox = alpha.point(lambda v: 255 if v >= 128 else 0).getbbox()
    ink = alpha.crop(bbox)
    if height is not None:
        h = round(height * SCALE)
        w = round(ink.width * h / ink.height)
    else:
        w = round(width * SCALE)
        h = round(ink.height * w / ink.width)
    ink = ink.resize((w, h), Image.LANCZOS)
    canvas = Image.new("L", (round(BOX_W * SCALE), round(BOX_H * SCALE)), 0)
    x = (canvas.width - w) // 2
    y = canvas.height - h - round(lift * SCALE)
    canvas.paste(ink, (x, y))
    return np.asarray(canvas, dtype=np.float64) / 255.0


def sdf(alpha: np.ndarray) -> np.ndarray:
    """안쪽은 음수, 바깥은 양수인 거리(px)"""
    inside = alpha >= 0.5
    return distance_transform_edt(~inside) - distance_transform_edt(inside)


def save(field: np.ndarray, index: int) -> None:
    # 경계 1px을 부드럽게(계단 현상 없이)
    a = np.clip(0.5 - field, 0.0, 1.0)
    rgba = np.zeros(field.shape + (4,), dtype=np.uint8)
    rgba[..., 3] = (a * 255).round().astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(OUT / f"f{index:02d}.png", optimize=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("f*.png"):
        old.unlink()
    fields = [sdf(place(*stage)) for stage in STAGES]
    index = 0
    for a, b in zip(fields, fields[1:]):
        for k in range(STEPS):
            # 일정한 속도로 모양이 바뀐다(걷는 속도처럼 고르게)
            t = k / STEPS
            save((1 - t) * a + t * b, index)
            index += 1
    save(fields[-1], index)
    print(f"{index + 1} frames -> {OUT}")


if __name__ == "__main__":
    main()
