# 유인원 실루엣(logo-ape-black.png)을 몸·뒷다리·앞다리·팔 그림으로 자른다. 프로젝트 루트에서: python scripts/cut-ape.py (Pillow 필요)
from PIL import Image, ImageDraw, ImageChops, ImageFilter
src = Image.open('assets/icons/logo-ape-black.png').convert('RGBA')
alpha = src.split()[3]
W, H = src.size
CROP = (260, 300, 1000, 1000)  # 740 x 700
SCALE = 0.3

def poly_mask(pts):
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon(pts, fill=255); return m
def circle_mask(c, r):
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).ellipse([c[0]-r, c[1]-r, c[0]+r, c[1]+r], fill=255); return m

parts = {
  # 뒷다리: 엉덩이 아래
  'backLeg': dict(poly=[(260,735),(560,725),(560,1000),(260,1000)], pivot=(465,725), r=58),
  # 앞다리: 배 아래
  'frontLeg': dict(poly=[(560,725),(598,652),(742,652),(792,800),(800,1000),(560,1000)], pivot=(655,690), r=55),
  # 팔: 어깨 아래
  'arm': dict(poly=[(742,652),(752,622),(1000,600),(1000,1000),(800,1000),(792,800)], pivot=(812,640), r=62),
}
body_alpha = alpha.copy()
out = {}
for name, p in parts.items():
    region = poly_mask(p['poly'])
    # 몸은 자른 선보다 7px 더 남겨서(팔다리가 몸 뒤에 그려짐) 이음매가 보이지 않게 한다.
    body_alpha = ImageChops.subtract(body_alpha, ImageChops.multiply(alpha, region.filter(ImageFilter.MinFilter(15))))
    limb = ImageChops.multiply(alpha, ImageChops.lighter(region, circle_mask(p['pivot'], p['r'])))
    out[name] = limb
out['body'] = body_alpha

def save(name, a):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); im.putalpha(a)
    black = Image.new('RGBA', (W, H), (0, 0, 0, 255)); black.putalpha(a)
    c = black.crop(CROP)
    c = c.resize((round(c.width*SCALE), round(c.height*SCALE)), Image.LANCZOS)
    c.save(f'assets/ape/ape-{name}.png', optimize=True)
for k, v in out.items(): save(k, v)
for name, p in parts.items():
    px = (p['pivot'][0]-CROP[0])/(CROP[2]-CROP[0]); py = (p['pivot'][1]-CROP[1])/(CROP[3]-CROP[1])
    print(name, round(px,4), round(py,4))
print('ground', round((978-CROP[1])/(CROP[3]-CROP[1]),4))
