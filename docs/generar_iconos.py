"""Genera los iconos de la PWA, el favicon, la imagen para WhatsApp (og-image) y el QR
a partir del logo de la escuela (src/assets/logo.png). Ejecutar desde la raíz del proyecto:
    python docs/generar_iconos.py
"""
import pathlib, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
LOGO = ROOT / 'src/assets/logo.png'
ICONS = ROOT / 'public/icons'
BG = (6, 13, 26, 255)          # #060d1a (theme_color)
APP_URL = 'https://tennis-padel-app-sigma.vercel.app'
JOIN_URL = APP_URL + '/unirse?codigo=MARINEDA2026'

logo = Image.open(LOGO).convert('RGBA')

# ── La "marca": el cuadrado rojo con la bola amarilla (parte izquierda del logo) ──
left = logo.crop((0, 0, 106, logo.height))   # solo el cuadrado rojo (el texto empieza en x≈112)
bbox = left.getbbox()                       # recorte exacto de lo no transparente
mark = left.crop(bbox)
# cuadrar con margen transparente
side = max(mark.size)
sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
sq.paste(mark, ((side - mark.width) // 2, (side - mark.height) // 2), mark)
mark = sq

def icon(size, fill_ratio, bg=BG, rounded=0):
    im = Image.new('RGBA', (size, size), bg)
    if rounded:
        m = Image.new('L', (size, size), 0)
        ImageDraw.Draw(m).rounded_rectangle((0, 0, size - 1, size - 1), radius=rounded, fill=255)
        im.putalpha(m)
    target = int(size * fill_ratio)
    mk = mark.resize((target, target), Image.LANCZOS)
    im.paste(mk, ((size - target) // 2, (size - target) // 2), mk)
    return im

ICONS.mkdir(exist_ok=True)
icon(512, 0.84).save(ICONS / 'icon-512.png')                 # purpose any
icon(192, 0.84).save(ICONS / 'icon-192.png')
icon(512, 0.62).save(ICONS / 'icon-maskable-512.png')        # zona segura del 80% (Android)
icon(180, 0.84).save(ICONS / 'apple-touch-icon.png')         # iOS (añade sus propias esquinas)
icon(64, 0.9, bg=(0, 0, 0, 0)).save(ROOT / 'public/favicon.png')   # pestaña del navegador

# ── Imagen de previsualización para WhatsApp / redes (1200×630) ──
og = Image.new('RGBA', (1200, 630), BG)
d = ImageDraw.Draw(og)
# halo suave (capa aparte con alpha; ImageDraw no mezcla alpha al dibujar directamente)
halo = Image.new('RGBA', og.size, (0, 0, 0, 0))
hd = ImageDraw.Draw(halo)
for r, a in ((560, 10), (440, 14), (320, 18)):
    hd.ellipse((600 - r, 300 - r, 600 + r, 300 + r), fill=(229, 57, 53, a))
og = Image.alpha_composite(og, halo)
d = ImageDraw.Draw(og)
lg = logo.resize((760, int(760 * logo.height / logo.width)), Image.LANCZOS)
og.paste(lg, ((1200 - lg.width) // 2, 150), lg)
try:
    f1 = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 44)
    f2 = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 28)
except Exception:
    f1 = f2 = ImageFont.load_default()
t1 = 'Liga de tenis y pádel · tu partido de cada semana'
t2 = 'Crea tu cuenta en un minuto y marca tus horas'
w1 = d.textlength(t1, font=f1); w2 = d.textlength(t2, font=f2)
d.text(((1200 - w1) / 2, 420), t1, font=f1, fill=(255, 255, 255, 255))
d.text(((1200 - w2) / 2, 485), t2, font=f2, fill=(118, 193, 255, 255))
og.convert('RGB').save(ROOT / 'public/og-image.png', optimize=True)

# ── QR del enlace de invitación (para imprimir en el club) ──
try:
    import qrcode
except ImportError:
    subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', 'qrcode[pil]'], check=False)
    import qrcode
qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=12, border=2)
qr.add_data(JOIN_URL); qr.make(fit=True)
qim = qr.make_image(fill_color='#b71c1c', back_color='white').convert('RGBA')
# marca en el centro
c = mark.resize((int(qim.width * 0.2),) * 2, Image.LANCZOS)
pad = Image.new('RGBA', (c.width + 24, c.height + 24), (255, 255, 255, 255))
pad.paste(c, (12, 12), c)
qim.paste(pad, ((qim.width - pad.width) // 2, (qim.height - pad.height) // 2))
qim.convert('RGB').save(ROOT / 'docs/qr-unirse.png')
print('OK iconos, favicon, og-image y QR')
