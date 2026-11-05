"""첫 화면(IntroWalk)용 '걸으면서 퇴화하는' 프레임 묶음(스프라이트 한 장)을 만든다.

사용자가 보낸 참고 영상처럼, 제자리에서 다리를 번갈아 내디디며 걷는 동안 몸 모양이
현대인 → 호미닌 → 웅크린 두 발 유인원 → 네 발 유인원으로 조금씩 변한다(전체 3초).

- 두 발 단계(1~4): 단계 그림에서 다리 두 개를 잘라(가랑이 아래, 땅에 닿는 덩어리만) 엉덩이 관절 둘레로
  앞뒤로 돌린다. 다리가 세로에 가까워지면 발이 땅을 뚫지 않게 다리를 그만큼 짧게(무릎을 굽힌 듯) 줄이고,
  앞으로 나가는 다리는 조금 더 들어 올린다. 팔은 그림 그대로(자르지 않음).
- 네 발 단계(5): 계획표의 걷는 유인원과 같은 방법(scripts/cut-ape.py의 자른 영역, apePose.ts의 걸음).
- 단계 사이: 같은 걸음 위상의 두 자세를 ① 걸음 한 주기 전체의 바깥 상자(머리 위·발 아래·좌우)가 같아지게 늘려 맞추고
  ② 광학 흐름(OpenCV Farneback)으로 남은 어긋남을 맞춘 뒤 ③ 거리장(SDF)으로 섞는다(투명도 없음).
  머리·발이 따로 줄어들다 사라지는 떨림과 발 조각이 떨어져 나가는 갈라짐을 막는다. 마지막에 발바닥 높이를 맞춘다.

결과: assets/intro/walk-sprite.png (프레임을 가로 COLS칸씩 늘어놓은 검은 실루엣) + 콘솔에 프레임 수.
실행: python3 scripts/make-intro-walk.py   (Pillow, numpy, scipy, opencv-python-headless 필요)
"""
from math import cos, pi, radians, sin
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter
from scipy.ndimage import (
    affine_transform,
    binary_dilation,
    distance_transform_edt,
    gaussian_filter,
    label,
    map_coordinates,
)

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "assets" / "icons"
OUT = ROOT / "assets" / "intro"

SCALE = 2  # pt → px
BOX_W, BOX_H = 96, 104  # 프레임 한 칸(pt). IntroWalk의 FRAME_W/FRAME_H와 같아야 한다.
FPS = 24  # IntroWalk의 FPS와 같아야 한다.
COLS = 16
CYCLES_PER_SEC = 1.2  # 한 걸음 주기(두 발짝). 인트로가 3초라 예전(0.85)보다 조금 빠르게

# 두 발 단계: 파일, 보이는 높이(pt), 가랑이(원본 px), 엉덩이 관절 높이(원본 px), 다리를 가르는 아래쪽 경계
# 팔: poly = 팔 덩어리를 감싸는 다각형, pivot = 어깨(팔이 돌아가는 중심), sign = 걸음 방향(+: 앞다리와 같이, -: 뒷다리와 같이)
# 좌표는 단계 그림을 (ox, oy)만큼 잘라 본 그림 기준(스크립트 아래 arm() 참고). d0/blend = 어깨에서 이만큼 떨어진 곳부터 휘기 시작해 blend에서 다 돌아간다.
ARM_SWING = 16.0  # 팔이 앞뒤로 흔들리는 각도(±도)


def arm(origin, poly, pivot, sign, d0, blend):
    ox, oy = origin
    return dict(
        poly=[(x + ox, y + oy) for x, y in poly],
        pivot=(pivot[0] + ox, pivot[1] + oy),
        sign=sign,
        d0=d0,
        blend=blend,
    )


O1, O2, O3, O4 = (319, 45), (308, 51), (312, 149), (261, 177)
BIPEDS = [
    dict(
        file="stage-1-human.png", height=96, crotch=(645, 754), hip_y=700,
        arms=[
            arm(O1, [(90, 300), (212, 300), (258, 404), (236, 440), (205, 520), (205, 700), (90, 700)], (235, 330), -1, 40, 120),
            arm(O1, [(402, 428), (700, 428), (700, 625), (445, 625), (445, 560), (398, 525)], (385, 330), 1, 100, 110),
        ],
    ),
    dict(
        file="stage-2-hunter.png", height=94, crotch=(650, 805), hip_y=755,
        arms=[
            arm(O2, [(100, 330), (215, 300), (250, 462), (240, 480), (240, 580), (225, 600), (225, 740), (100, 740)], (230, 320), -1, 40, 120),
        ],
    ),
    dict(
        file="stage-3-hominid.png", height=82, crotch=(642, 754), hip_y=712,
        arms=[
            arm(O3, [(80, 260), (210, 250), (268, 328), (250, 350), (222, 420), (205, 470), (205, 620), (80, 620)], (215, 280), -1, 30, 120),
            arm(O3, [(405, 395), (700, 395), (700, 610), (530, 610), (530, 520), (420, 440), (405, 420)], (405, 320), 1, 90, 110),
        ],
    ),
    dict(
        file="stage-4-ape.png", height=76, crotch=(546, 730), hip_y=690,
        arms=[
            arm(O4, [(490, 380), (610, 380), (720, 560), (720, 760), (590, 760), (590, 640), (540, 580), (490, 480)], (545, 340), -1, 50, 130),
        ],
    ),
]
APE_WIDTH = 78  # 마지막 네 발 유인원 폭(pt), 계획표 RunningApe와 같은 그림

# 인트로 전체 3초(사용자 요청) = 이 그림 묶음 2.6초 + 사라지는 0.4초(IntroWalk의 FADE_MS).
# 단계는 4개만 쓴다(사용자 요청: "그냥 사람에서 유인원으로"): 현대인 → 호미닌 → 웅크린 두 발 유인원 → 네 발 유인원.
# 창 든 원시인(BIPEDS[1])은 3초 안에 너무 많은 단계가 지나가서 뺐다(그림은 남겨 두었다).
STAGE_ORDER = [0, 2, 3]  # BIPEDS 번호. 맨 뒤에 네 발 유인원(Ape)을 붙인다.
# 시간표(초): (구간 길이, 시작 단계, 끝 단계). 같은 단계면 그 모습으로 걷기만 한다.
TIMELINE = [
    (0.3, 0, 0),
    (0.7, 0, 1),
    (0.7, 1, 2),
    (0.7, 2, 3),
    (0.2, 3, 3),
]


def load_alpha(name: str) -> np.ndarray:
    return np.asarray(Image.open(ICONS / name).convert("RGBA").getchannel("A"), dtype=np.float64) / 255.0


# ---------- 팔 ----------
class Arm:
    """그림에서 팔 덩어리를 떼어 어깨 둘레로 부드럽게 휘어 돌린다(어깨 쪽은 그대로, 멀수록 많이)."""

    PAD = 170  # 돌아간 팔이 들어갈 여유(px)

    def __init__(self, alpha: np.ndarray, spec: dict):
        H, W = alpha.shape
        region = Image.new("L", (W, H), 0)
        ImageDraw.Draw(region).polygon([tuple(p) for p in spec["poly"]], fill=255)
        mask = np.asarray(region, dtype=np.float64) / 255.0
        xs = [p[0] for p in spec["poly"]]
        ys = [p[1] for p in spec["poly"]]
        x0, x1 = max(0, int(min(xs)) - self.PAD), min(W, int(max(xs)) + self.PAD)
        y0, y1 = max(0, int(min(ys)) - self.PAD), min(H, int(max(ys)) + self.PAD)
        self.box = (y0, y1, x0, x1)
        self.sign = spec["sign"]
        self.pivot = spec["pivot"]
        gy, gx = np.mgrid[y0:y1, x0:x1].astype(np.float64)
        d = np.hypot(gx - self.pivot[0], gy - self.pivot[1])
        w = np.clip((d - spec["d0"]) / spec["blend"], 0, 1)
        self.weight = w * w * (3 - 2 * w)
        self.gx, self.gy = gx, gy
        self.layer = (alpha * mask)[y0:y1, x0:x1]
        # 거의 안 움직이는(어깨 가까운) 부분은 몸통에 그대로 남겨 이음매가 생기지 않게 한다.
        removed = np.zeros_like(alpha)
        removed[y0:y1, x0:x1] = (mask[y0:y1, x0:x1] > 0.5) & (self.weight >= 0.02)
        self.removed = removed

    def paste(self, out: np.ndarray, degrees: float) -> None:
        y0, y1, x0, x1 = self.box
        px, py = self.pivot
        delta = radians(degrees) * self.weight
        qx, qy = self.gx - px, self.gy - py
        c, s_ = np.cos(delta), np.sin(delta)
        sx = c * qx - s_ * qy + px
        sy = s_ * qx + c * qy + py
        moved = map_coordinates(self.layer, [sy - y0, sx - x0], order=1, mode="constant", cval=0.0)
        out[y0:y1, x0:x1] = np.maximum(out[y0:y1, x0:x1], moved)


# ---------- 두 발 단계 ----------
class Biped:
    """두 발 단계 그림 한 장을 제자리 걷기 자세로 바꾼다.

    다리를 딱딱하게 잘라 돌리면 엉덩이 옆에 홈(계단)이 생겨서, 대신 부드럽게 휘게(스키닝) 한다:
    엉덩이 관절 조금 위에서 0 → 관절 아래 BLEND px에서 1로 바뀌는 무게만큼만 각 다리를 관절 둘레로 돌린다.
    다리가 세로에 가까워지면 발이 땅을 뚫지 않게 다리 방향으로 줄이고(무릎을 굽힌 듯),
    앞으로 나가는 다리는 조금 더 들어 올린다. 팔은 그림 그대로다.
    """

    TOP = 40  # 관절보다 이만큼 위부터 휘기 시작(px, 원본)
    BLEND = 110  # 이만큼 내려가면 다 돌아간다

    def __init__(self, spec: dict):
        self.alpha = load_alpha(spec["file"])
        H, W = self.alpha.shape
        cx, cy = spec["crotch"]
        hip_y = spec["hip_y"]
        solid = self.alpha >= 0.5
        ys, xs = np.nonzero(solid)
        self.ground = ys.max()
        self.ink = (xs.min(), ys.min(), xs.max(), ys.max())
        top = hip_y - self.TOP
        # 휘는 줄(top) 아래에서 땅에 닿는 덩어리 = 다리+골반(늘어뜨린 손은 땅에 안 닿아서 빠진다)
        below = solid.copy()
        below[:top, :] = False
        labels, _ = label(below)
        touching = set(np.unique(labels[self.ground - 6 : self.ground + 1, :])) - {0}
        lower = binary_dilation(np.isin(labels, list(touching)), iterations=2)
        lower[:top, :] = False
        col = np.arange(W)[None, :]
        self.lower = {"back": self.alpha * (lower & (col < cx)), "front": self.alpha * (lower & (col >= cx))}
        self.upper = self.alpha * (~lower)
        self.pivot = (float(cx), float(hip_y))
        self.top = top
        self.leg_h = self.ground - hip_y
        legs = lower.copy()
        legs[: cy, :] = False
        self.rest = {k: self._rest_angle(legs & (col < cx) if k == "back" else legs & (col >= cx)) for k in ("back", "front")}
        self.height_pt = spec["height"]
        # 계산을 줄이려고 휘는 줄 아래만 다룬다.
        self.rows = slice(top - 4, H)
        gy, gx = np.mgrid[self.rows, 0:W].astype(np.float64)
        self.gx, self.gy = gx, gy
        w = np.clip((gy - top) / self.BLEND, 0, 1)
        self.weight = w * w * (3 - 2 * w)
        self.arms = [Arm(self.alpha, a) for a in spec.get("arms", [])]
        # 팔은 몸통에서 떼어 따로 돌리므로, 몸통 쪽 그림에서는 (어깨 근처 움직이지 않는 부분만 빼고) 지운다.
        for a in self.arms:
            self.upper = self.upper * (1 - a.removed)

    def _rest_angle(self, mask: np.ndarray) -> float:
        ys, xs = np.nonzero(mask)
        low = ys >= ys.max() - 25
        fx, fy = xs[low].mean(), ys[low].mean()
        px, py = self.pivot
        # 아래 방향(세로)에서 앞(+x)으로 기운 각도(도)
        return float(np.degrees(np.arctan2(fx - px, fy - py)))

    def _warp(self, img: np.ndarray, rest: float, target: float, lift: float) -> np.ndarray:
        """출력 픽셀마다 원본 위치를 거꾸로 찾아(역변환) 다리를 부드럽게 휘어 돌린다."""
        px, py = self.pivot
        length = self.leg_h / max(0.2, cos(radians(rest)))
        reach = length * cos(radians(target))
        shrink = min(1.0, self.leg_h / max(1.0, reach)) * (1 - lift)
        w = self.weight
        delta = radians(target - rest) * w  # 휘는 각도(앞으로 +)
        scale = 1 + (shrink - 1) * w
        qx, qy = self.gx - px, self.gy - py
        # 다리 방향(목표 각도) 성분만 줄였던 것을 되돌린다.
        dx, dy = sin(radians(target)), cos(radians(target))
        along = qx * dx + qy * dy
        qx = qx + along * (1 / scale - 1) * dx
        qy = qy + along * (1 / scale - 1) * dy
        # 앞으로(발이 +x 쪽으로) 돌린 것을 되돌린다. 화면 좌표(y 아래)에서 발을 +x로 보내는 회전의 역.
        c, s_ = np.cos(delta), np.sin(delta)
        sx = c * qx - s_ * qy + px
        sy = s_ * qx + c * qy + py
        out = np.zeros_like(img)
        out[self.rows] = map_coordinates(img, [sy, sx], order=1, mode="constant", cval=0.0)
        return out

    def pose(self, phase: float) -> np.ndarray:
        # 뒷다리 rest_b → rest_f → rest_b, 앞다리는 반대로(제자리 걷기 한 주기)
        rb, rf = self.rest["back"], self.rest["front"]
        k = (1 - cos(phase)) / 2  # 0 → 1 → 0
        s = sin(phase)
        back = self._warp(self.lower["back"], rb, rb + (rf - rb) * k, 0.10 * max(0.0, s))
        front = self._warp(self.lower["front"], rf, rf + (rb - rf) * k, 0.10 * max(0.0, -s))
        out = np.maximum(np.maximum(back, front), self.upper)
        for a in self.arms:
            a.paste(out, a.sign * ARM_SWING * cos(phase))
        return out

    def walk_sdf(self, phase: float) -> np.ndarray:
        return sdf(self.place(self.pose(phase)))

    def place(self, alpha: np.ndarray) -> np.ndarray:
        """원본 좌표의 자세를 칸 안에 놓는다(그림 단계 크기, 가운데, 발은 바닥)."""
        x0, y0, x1, y1 = self.ink
        k = self.height_pt * SCALE / (y1 - y0)
        return place_scaled(alpha, k, (x0 + x1) / 2, self.ground, 0.0)


# ---------- 네 발 단계(계획표 RunningApe와 같은 자름·걸음) ----------
APE_CROP = (260, 300, 1000, 1000)  # cut-ape.py의 CROP
APE_PARTS = {
    "backLeg": dict(poly=[(260, 735), (560, 725), (560, 1000), (260, 1000)], pivot=(465, 725), r=58),
    "frontLeg": dict(poly=[(560, 725), (598, 652), (742, 652), (792, 800), (800, 1000), (560, 1000)], pivot=(655, 690), r=55),
    "arm": dict(poly=[(742, 652), (752, 622), (1000, 600), (1000, 1000), (800, 1000), (792, 800)], pivot=(812, 640), r=62),
}
APE_TIPS = {"backLeg": (0.162, 0.9686), "frontLeg": (0.595, 0.9686), "arm": (0.905, 0.9686)}
APE_GROUND = 0.9686
# apePose.ts의 gaitParams(0.35): 천천히 걷기와 빠르게 걷기 사이
APE_LEG_SWING, APE_ARM_SWING, APE_LEAN = 16.8, 14.8, 1.4


class Ape:
    def __init__(self):
        src = Image.open(ICONS / "logo-ape-black.png").convert("RGBA")
        alpha = src.getchannel("A")
        W, H = src.size
        body = alpha.copy()
        self.parts = {}
        for name, p in APE_PARTS.items():
            region = Image.new("L", (W, H), 0)
            ImageDraw.Draw(region).polygon(p["poly"], fill=255)
            body = ImageChops.subtract(body, ImageChops.multiply(alpha, region.filter(ImageFilter.MinFilter(15))))
            circle = Image.new("L", (W, H), 0)
            cx, cy = p["pivot"]
            ImageDraw.Draw(circle).ellipse([cx - p["r"], cy - p["r"], cx + p["r"], cy + p["r"]], fill=255)
            self.parts[name] = ImageChops.multiply(alpha, ImageChops.lighter(region, circle))
        self.body = body
        self.size = (W, H)

    def _tip_y(self, name: str, deg: float) -> float:
        cw, ch = APE_CROP[2] - APE_CROP[0], APE_CROP[3] - APE_CROP[1]
        px = (APE_PARTS[name]["pivot"][0] - APE_CROP[0]) / cw
        py = (APE_PARTS[name]["pivot"][1] - APE_CROP[1]) / ch
        tx, ty = APE_TIPS[name]
        aspect = ch / cw
        r = radians(deg)
        dx, dy = tx - px, (ty - py) * aspect
        return py + (dx * sin(r) + dy * cos(r)) / aspect

    def pose(self, phase: float) -> np.ndarray:
        swing = sin(phase)
        angles = {"backLeg": APE_LEG_SWING * swing, "frontLeg": -APE_LEG_SWING * swing, "arm": APE_ARM_SWING * swing}
        far_arm = -APE_ARM_SWING * swing
        lowest = max(self._tip_y(n, a) for n, a in angles.items())
        ch = APE_CROP[3] - APE_CROP[1]
        shift = (APE_GROUND - lowest) * ch
        W, H = self.size
        out = Image.new("L", (W, H), 0)

        def put(img: Image.Image, name: str, deg: float, dx: float = 0.0):
            # CSS rotate(+)는 시계 방향, PIL rotate(+)는 반시계 방향
            rotated = img.rotate(-deg, resample=Image.BICUBIC, center=APE_PARTS[name]["pivot"])
            moved = Image.new("L", (W, H), 0)
            moved.paste(rotated, (round(dx), 0))
            return ImageChops.lighter(out, moved)

        out = put(self.parts["arm"], "arm", far_arm, -0.035 * (APE_CROP[2] - APE_CROP[0]))
        out = put(self.parts["backLeg"], "backLeg", angles["backLeg"])
        out = put(self.parts["frontLeg"], "frontLeg", angles["frontLeg"])
        out = put(self.parts["arm"], "arm", angles["arm"])
        out = ImageChops.lighter(out, self.body)
        # 몸 숙임(발바닥 가운데 기준)과 높이 맞춤
        pivot = ((APE_CROP[0] + APE_CROP[2]) / 2, APE_CROP[1] + APE_GROUND * ch)
        out = out.rotate(-APE_LEAN, resample=Image.BICUBIC, center=pivot)
        shifted = Image.new("L", (W, H), 0)
        shifted.paste(out, (0, round(shift)))
        return np.asarray(shifted, dtype=np.float64) / 255.0

    def walk_sdf(self, phase: float) -> np.ndarray:
        return sdf(self.place(self.pose(phase)))

    def place(self, alpha: np.ndarray) -> np.ndarray:
        cw, ch = APE_CROP[2] - APE_CROP[0], APE_CROP[3] - APE_CROP[1]
        k = APE_WIDTH * SCALE / cw
        ground = APE_CROP[1] + APE_GROUND * ch
        # 계획표 RunningApe처럼 발바닥이 그림 상자 아래에서 3% 위 → 칸 바닥에서 그만큼 띄운다.
        lift = APE_WIDTH * (700 / 740) * (1 - APE_GROUND) * SCALE
        return place_scaled(alpha, k, (APE_CROP[0] + APE_CROP[2]) / 2, ground, lift)


def place_scaled(alpha: np.ndarray, k: float, center_x: float, ground_y: float, lift_px: float) -> np.ndarray:
    """원본 좌표 그림을 k배로 줄여, center_x가 칸 가운데·ground_y가 칸 바닥(−lift)에 오게 놓는다."""
    img = Image.fromarray((np.clip(alpha, 0, 1) * 255).astype(np.uint8), "L")
    W, H = img.size
    small = img.resize((max(1, round(W * k)), max(1, round(H * k))), Image.LANCZOS)
    cell = Image.new("L", (BOX_W * SCALE, BOX_H * SCALE), 0)
    x = round(cell.width / 2 - center_x * k)
    y = round(cell.height - lift_px - ground_y * k)
    cell.paste(small, (x, y))
    return np.asarray(cell, dtype=np.float64) / 255.0


def sdf(alpha: np.ndarray) -> np.ndarray:
    inside = alpha >= 0.5
    return distance_transform_edt(~inside) - distance_transform_edt(inside)


def phase_of(stage: int, phase: float) -> float:  # stage = 시간표의 단계 번호(맨 뒤가 네 발 유인원)
    """두 발 단계의 뒷다리는 -cos(phase)로, 네 발 단계의 뒷다리는 sin(phase)로 움직인다 → 네 발 쪽을 1/4주기 늦춰 같은 위상으로 맞춘다."""
    return phase - pi / 2 if stage == len(STAGE_ORDER) else phase


def _bbox(cell: np.ndarray) -> tuple:
    ys, xs = np.where(cell >= 0.5)
    return xs.min(), xs.max() + 1, ys.min(), ys.max() + 1


def cycle_bbox(stages: list, index: int) -> tuple:
    """걸음 한 주기 동안 모양이 차지하는 바깥 상자(x0, x1, y0, y1). 프레임마다 흔들리지 않게 주기 전체로 잰다."""
    boxes = np.array([_bbox(stages[index].place(stages[index].pose(phase_of(index, 2 * pi * k / 16)))) for k in range(16)])
    return boxes[:, 0].min(), boxes[:, 1].max(), boxes[:, 2].min(), boxes[:, 3].max()


def fit_to_box(alpha: np.ndarray, src: tuple, dst: tuple) -> np.ndarray:
    """src 상자 안의 그림을 dst 상자에 꽉 차게 늘리거나 줄인다(반올림 없이 부드럽게)."""
    sx0, sx1, sy0, sy1 = src
    dx0, dx1, dy0, dy1 = dst
    ky, kx = (sy1 - sy0) / (dy1 - dy0), (sx1 - sx0) / (dx1 - dx0)
    offset = np.array([sy0 - dy0 * ky, sx0 - dx0 * kx])
    return affine_transform(alpha, np.diag([ky, kx]), offset=offset, order=1, mode="constant", cval=0)


def _remap(img: np.ndarray, gx: np.ndarray, gy: np.ndarray) -> np.ndarray:
    return cv2.remap(
        img.astype(np.float32), np.ascontiguousarray(gx, np.float32), np.ascontiguousarray(gy, np.float32),
        cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE,
    )


def morph_field(stages: list, boxes: list, a: int, b: int, m: float, phase: float) -> np.ndarray:
    """단계 a → b 사이 m(0~1)의 거리장. 두 자세를 같은 상자에 맞추고 흐름으로 정렬한 뒤 섞는다."""
    target = tuple((1 - m) * p + m * q for p, q in zip(boxes[a], boxes[b]))
    pa = fit_to_box(stages[a].place(stages[a].pose(phase_of(a, phase))), boxes[a], target)
    pb = fit_to_box(stages[b].place(stages[b].pose(phase_of(b, phase))), boxes[b], target)
    blur_a = (gaussian_filter(pa, 4) * 255).astype(np.uint8)
    blur_b = (gaussian_filter(pb, 4) * 255).astype(np.uint8)
    flow = cv2.calcOpticalFlowFarneback(blur_a, blur_b, None, 0.5, 5, 31, 5, 7, 1.5, 0)  # A(x) ≈ B(x + flow)
    gy, gx = np.mgrid[0 : pa.shape[0], 0 : pa.shape[1]].astype(np.float32)
    fa = _remap(sdf(pa), gx - m * flow[..., 0], gy - m * flow[..., 1])
    fb = _remap(sdf(pb), gx + (1 - m) * flow[..., 0], gy + (1 - m) * flow[..., 1])
    return (1 - m) * fa + m * fb


def stage_bottom(stages: list, index: int, phase: float) -> float:
    return _bbox(stages[index].place(stages[index].pose(phase_of(index, phase))))[3]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    stages = [Biped(BIPEDS[i]) for i in STAGE_ORDER] + [Ape()]
    boxes = [cycle_bbox(stages, i) for i in range(len(stages))]
    frames = []
    t = 0.0
    for seconds, a, b in TIMELINE:
        n = round(seconds * FPS)
        for i in range(n):
            phase = 2 * pi * CYCLES_PER_SEC * (t + i / FPS)
            if a == b:
                cell = np.clip(0.5 - stages[a].walk_sdf(phase_of(a, phase)), 0, 1)
            else:
                m = i / n
                m = m * m * (3 - 2 * m)  # 천천히 시작해 천천히 끝나게
                cell = np.clip(0.5 - morph_field(stages, boxes, a, b, m, phase), 0, 1)
                # 발바닥 높이: 두 단계의 같은 위상 발바닥 높이를 섞은 값으로 맞춘다(발이 떠서 오르내리지 않게).
                want = (1 - m) * stage_bottom(stages, a, phase) + m * stage_bottom(stages, b, phase)
                _, _, top, bottom = _bbox(cell)
                k = (bottom - top) / (want - top)  # 머리 위는 그대로 두고 다리만 늘려 발바닥을 맞춘다
                cell = np.clip(
                    affine_transform(cell, np.diag([k, 1.0]), offset=[top - top * k, 0], order=1, mode="constant", cval=0), 0, 1
                )
                # 몸에서 떨어진 아주 작은 조각(발 끝 등)은 지운다.
                parts, count = label(cell >= 0.5)
                if count > 1:
                    sizes = np.bincount(parts.ravel())
                    sizes[0] = 0
                    keep = sizes >= sizes.max() * 0.02
                    specks = binary_dilation((parts > 0) & ~keep[parts], iterations=1)
                    cell = np.where(specks, 0.0, cell)
            frames.append(cell)
        t += n / FPS
    rows = (len(frames) + COLS - 1) // COLS
    fw, fh = BOX_W * SCALE, BOX_H * SCALE
    sheet = np.zeros((rows * fh, COLS * fw), dtype=np.float64)
    for i, f in enumerate(frames):
        r, c = divmod(i, COLS)
        sheet[r * fh : (r + 1) * fh, c * fw : (c + 1) * fw] = f
    rgba = np.zeros(sheet.shape + (4,), dtype=np.uint8)
    rgba[..., 3] = (sheet * 255).round().astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(OUT / "walk-sprite.png", optimize=True)
    print(f"frames={len(frames)} cols={COLS} rows={rows} size={COLS * fw}x{rows * fh}")


if __name__ == "__main__":
    main()
