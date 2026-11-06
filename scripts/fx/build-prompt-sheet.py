import json, sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation

SP, OUT = sys.argv[1], sys.argv[2]
rows = json.load(open(SP + '/rows.json', encoding='utf8'))

INBOX = 'docs/art/sources/fx-chatgpt'

# The Gen IV moves a pret sprite (often re-paletted, as the GBA itself does: Ice Punch is Fire Punch's fist) draws.
COMPOSE = {
    'call-for-help': 'alert + movement_waves on the user',
    'cover': 'protect re-paletted gold, over the ally it covers',
    'snarl': 'noise_line re-paletted dark + BG_DARK flash',
    'night-slash': 'slash re-paletted dark + BG_DARK',
    'bullet-punch': 'punch_impact re-paletted steel + speed_dust, fast',
    'magnet-bomb': 'metal_ball volley + spark_0 on impact',
    'iron-head': 'masks/metal_shine on the user + impact',
    'aqua-ring': 'guard_ring re-paletted blue + small_bubbles circling',
    'roost': 'white_feather falling + sparkle_1',
    'u-turn': 'white_shadow dash + impact, user returns',
    'giga-impact': 'BG_HIGHSPEED + impact_3 + explosion',
    'draco-meteor': 'meteor re-paletted dragon (orange/purple), five falling',
    'leaf-storm': 'razor_leaf + leaf in a whirlwind_lines spiral',
    'close-combat': 'hands_and_feet, six rapid hits + impact',
    'flare-blitz': 'spinning_fire around the user + fire on impact',
    'brave-bird': 'bird re-paletted blue with white_feather trail',
    'shadow-claw': 'claw_slash re-paletted ghost purple',
    'shadow-sneak': 'white_shadow re-paletted black, stretching to the foe',
    'seed-bomb': 'seed volley + explosion_2 small',
    'energy-ball': 'shadow_ball re-paletted green',
    'power-whip': 'vine, large lash',
    'drain-punch': 'punch_impact + orbs drained back (Giga Drain)',
    'vacuum-wave': 'air_wave re-paletted pale blue',
    'double-hit': 'impact twice, staggered',
    'aqua-jet': 'water_droplet trail + water_impact',
    'aqua-tail': 'water_column + splash',
    'ice-shard': 'ice_chunk volley',
    'ice-fang': 'fangs + ice_crystals_0',
    'fire-fang': 'fangs + small_ember',
    'thunder-fang': 'fangs + spark_0',
    'lava-plume': 'fire_plume + warm_rock around the user',
    'discharge': 'electricity + electric_orbs radiating',
    'poison-jab': 'horn_hit re-paletted purple + poison_bubble',
    'cross-poison': 'cross_impact re-paletted purple',
    'earth-power': 'fire_plume re-paletted brown + flying_dirt under the target',
    'mud-bomb': 'mud_sand_0 ball + explosion re-paletted brown',
    'air-slash': 'air_slash (pret has the sprite)',
    'zen-headbutt': 'BG_PSYCHIC flash + impact',
    'psycho-cut': 'cut re-paletted psychic pink',
    'x-scissor': 'x_sign + cut, crossing',
    'bug-buzz': 'metal_sound_waves re-paletted green',
    'power-gem': 'gem_1 / gem_2 / gem_3 volley',
    'rock-polish': 'sparkle_1 on the user, re-paletted stone',
    'nasty-plot': 'thought_bubble + devil',
    'payback': 'impact + BG_DARK',
    'sucker-punch': 'punch_impact + BG_DARK, very fast',
    'wake-up-slap': 'humanoid_hand + smellingsalt_effect',
    'brine': 'water_impact + splash',
    'avalanche': 'ice_chunk large, falling on the target',
}

STYLE = (
    'A sprite sheet for one battle-move animation in authentic 16-bit Game Boy Advance pixel art, '
    'Pokemon FireRed / LeafGreen / Emerald era. The image is a {grid} grid of {n} equal square cells, each exactly {cell} px, '
    'with no gaps, borders, grid lines or numbers. Each cell is one animation frame, read left to right, top to bottom. '
    'Draw every frame on a logical {logical} by {logical} pixel canvas enlarged 8 times: every pixel a crisp hard square, '
    'no anti-aliasing, no gradients, no glow blur, no soft edges, no dithering. Use at most 12 flat colours across the whole '
    'sheet, the identical palette in every frame, and a dark 1-pixel outline around the main shapes. The effect is drawn at '
    'the same scale and anchored at the same point in every cell, and never touches a cell edge (keep a 4-pixel empty margin). '
    'Background MUST be one perfectly flat solid {key} in every cell; never use that colour, or anything close to it, inside the '
    'effect. No creature, Pokemon, person, face, scenery, ground line, UI, text, letters or watermark.'
)

MAGENTA, GREEN = 'magenta #FF00FF', 'pure green #00FF00'

CHATGPT = [
    dict(id='wood-hammer', frames=4, key=MAGENTA, anchor='the left-centre of each cell (the log swings from there)',
         use='El tronco aparece sobre el usuario y cae en arco sobre el objetivo; al golpear, impacto y tierra de pret.',
         subject='a thick round wooden log, brown bark with two lighter rings on its cut end and one small green leaf sprig, '
                 'swinging in an overhead arc from left to right.',
         frames_text='1) log raised upright, 2) log tilted 45 degrees forward, 3) log horizontal with three short white motion '
                     'lines behind it, 4) log tilted down past horizontal with a small burst of wood chips.'),
    dict(id='dragon-pulse', frames=4, key=MAGENTA, anchor='the centre of each cell',
         use='Vuela del usuario al objetivo repitiendo los 4 fotogramas; al llegar, golpe de pret y destello azul-violeta.',
         subject='a shock wave shaped like a dragon\'s head made of blue-violet energy, open jaws facing right, '
                 'with a trailing tail of energy behind it.',
         frames_text='1) jaws closed, tail short, 2) jaws half open, tail longer, 3) jaws wide open with a bright core, '
                     '4) jaws half open, tail flickering. Frames 1-4 loop.'),
    dict(id='aura-sphere', frames=4, key=MAGENTA, anchor='the centre of each cell',
         use='Se carga sobre el usuario (1-2) y vuela al objetivo repitiendo 3-4; impacto de pret al llegar.',
         subject='a sphere of pale-blue fighting aura with a white core and flame-like wisps of darker blue around its rim.',
         frames_text='1) small sphere forming, 2) full sphere, wisps short, 3) full sphere, wisps flaring right, '
                     '4) full sphere, wisps flaring left.'),
    dict(id='dark-pulse', frames=4, key=GREEN, anchor='the centre of each cell',
         use='Sale del usuario en anillos que crecen por el campo, con el fondo oscuro de la GBA; el objetivo parpadea.',
         subject='a ring of black and deep-purple dark energy with small jagged spikes on its outer edge, seen face on.',
         frames_text='1) small ring, 2) medium ring, 3) large ring, spikes longer, 4) largest ring breaking into fragments.'),
    dict(id='flash-cannon', frames=4, key=MAGENTA, anchor='the centre of each cell',
         use='Se concentra en el usuario (1-3) y se dispara como rayo repitiendo el 4; destello blanco al impactar.',
         subject='a ball of silver-white steel light with a pale cyan rim and four short sharp rays.',
         frames_text='1) small dot with two rays, 2) half-size ball, four rays, 3) full ball, long rays, '
                     '4) full ball stretched horizontally to the right, ready to fire.'),
    dict(id='gunk-shot', frames=6, key=GREEN, anchor='the centre of each cell',
         use='1-3 se repiten mientras vuela; 4-6 se reproducen sobre el objetivo al reventar.',
         subject='a heavy glob of purple-brown toxic sludge with lighter bubbles on its surface and small drips.',
         frames_text='1) round glob, 2) glob stretched right, 3) glob squashed, 4) glob flattening on impact, '
                     '5) wide splat with flying droplets, 6) small puddle with two bubbles popping.'),
    dict(id='stone-edge', frames=4, key=MAGENTA, anchor='the bottom-centre of each cell (it rises from the target\'s feet)',
         use='Surge bajo el objetivo, dos o tres escalonadas; rocas y polvo de pret al caer.',
         subject='a cluster of three sharp pointed grey-blue stone spikes with pale highlights on one face, rising upward.',
         frames_text='1) only the spike tips showing, 2) spikes half risen, 3) spikes fully risen with small rock chips flying, '
                     '4) spikes cracking with chips falling.'),
    dict(id='stealth-rock', frames=4, key=MAGENTA, anchor='the centre of each cell',
         use='El usuario las lanza y quedan flotando en el lado rival; se repite como indicador mientras dura.',
         subject='three small jagged floating rocks, grey-brown with sharp edges and a faint pale-blue glint, '
                 'arranged in a loose triangle.',
         frames_text='1) rocks at rest, 2) rocks one pixel higher, 3) rocks two pixels higher with a glint on the top rock, '
                     '4) rocks one pixel higher. Frames 1-4 loop as a gentle bob.'),
]


def prompt(c):
    n = c['frames']
    grid, size = ('2 x 2', '1024 x 1024') if n == 4 else ('3 columns x 2 rows', '1536 x 1024')
    style = STYLE.format(grid=grid, n=n, cell=512, logical=64, key=c['key'])
    return f"{style}\n\nSubject: {c['subject']}\nAnchor: {c['anchor']}.\nFrames: {c['frames_text']}", grid, size


ARIAL = 'Arial'
H = Font(name=ARIAL, bold=True, color='FFFFFF')
HF = PatternFill('solid', start_color='2A2230')
INPUT = PatternFill('solid', start_color='FFF2CC')
B = Font(name=ARIAL)
WRAP = Alignment(wrap_text=True, vertical='top')
thin = Side(style='thin', color='CCCCCC')
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)


def header(ws, cols):
    for i, (name, width) in enumerate(cols, 1):
        c = ws.cell(row=1, column=i, value=name)
        c.font, c.fill, c.alignment = H, HF, Alignment(vertical='center', wrap_text=True)
        ws.column_dimensions[c.column_letter].width = width
    ws.freeze_panes = 'A2'
    ws.row_dimensions[1].height = 30


wb = Workbook()

# ── Cómo usar ──
ws = wb.active
ws.title = 'Cómo usar'
ws.column_dimensions['A'].width = 120
lines = [
    ('Animaciones de movimientos — lo que tienes que generar en ChatGPT', True),
    ('', False),
    ('De dónde sale cada animación', True),
    ('• 253 movimientos usan su animación real de GBA (pret/pokefirered): los importo yo, no tienes que hacer nada.', False),
    ('• 109 variantes -plus reutilizan la animación de su movimiento base.', False),
    ('• 49 movimientos de Gen IV se componen con sprites de pret (a menudo con otra paleta, como hace la propia GBA).', False),
    (f'• {len(CHATGPT)} movimientos no tienen nada en pret que se lea bien: son las filas de la hoja «ChatGPT».', False),
    ('La hoja «Todos los movimientos» lista los 419 con su origen.', False),
    ('', False),
    ('Pasos por fila de la hoja «ChatGPT»', True),
    ('1. En ChatGPT, elige el tamaño de la columna «Tamaño imagen» (cuadrado 1024×1024 o horizontal 1536×1024).', False),
    ('2. Pega el prompt de la columna «Prompt» tal cual (en inglés: ChatGPT lo sigue mejor).', False),
    ('3. Comprueba antes de descargar: rejilla correcta, fondo liso del color pedido, el efecto en el mismo sitio en cada celda.', False),
    ('   Si no se cumple, pide «Regenerate, keeping the exact same grid and background» en vez de corregir a mano.', False),
    ('4. Descarga el PNG sin tocarlo (sin recortar, sin quitar el fondo) y guárdalo con el nombre de «Nombre de archivo»', False),
    ('   en la carpeta de «Ruta» (relativa a la carpeta del proyecto Pokémon Ascendant).', False),
    ('5. Marca «Hecho» en la columna amarilla. Cuando tengas varias, dímelo: las recorto, las paso a la rejilla de píxeles', False),
    ('   y a paleta limitada, y las monto en su animación.', False),
    ('', False),
    ('Columnas amarillas = las que rellenas tú (Hecho, Notas). El resto no se toca.', False),
    ('Si una imagen no te convence, guarda varias como wood-hammer.png, wood-hammer-2.png…: elijo la mejor al importar.', False),
]
for r, (text, bold) in enumerate(lines, 1):
    c = ws.cell(row=r, column=1, value=text)
    c.font = Font(name=ARIAL, bold=bold, size=13 if r == 1 else 11)

# ── ChatGPT ──
ws = wb.create_sheet('ChatGPT')
cols = [('#', 5), ('Movimiento', 16), ('Tipo', 10), ('Nombre de archivo', 20), ('Ruta', 30), ('Tamaño imagen', 13),
        ('Rejilla', 14), ('Fotogramas', 11), ('Fondo', 18), ('Cómo se usa en combate', 42), ('Prompt', 110),
        ('Hecho', 8), ('Notas', 30)]
header(ws, cols)
dv = DataValidation(type='list', formula1='"Sí,No"', allow_blank=True)
ws.add_data_validation(dv)
types = {r['id']: r for r in rows}
for i, c in enumerate(CHATGPT, 2):
    p, grid, size = prompt(c)
    r = types[c['id']]
    vals = [i - 1, r['name'], r['type'], f"{c['id']}.png", INBOX + '/', size, grid, c['frames'],
            c['key'].replace('pure green', 'verde puro'), c['use'], p, 'No', '']
    for j, v in enumerate(vals, 1):
        cell = ws.cell(row=i, column=j, value=v)
        cell.font, cell.alignment, cell.border = B, WRAP, BOX
    ws.cell(row=i, column=12).fill = INPUT
    ws.cell(row=i, column=13).fill = INPUT
    dv.add(ws.cell(row=i, column=12))
    ws.row_dimensions[i].height = 260
last = len(CHATGPT) + 1
ws.cell(row=last + 2, column=2, value='Hechas').font = Font(name=ARIAL, bold=True)
ws.cell(row=last + 2, column=4, value=f'=COUNTIF(L2:L{last},"Sí")&" de "&COUNTA(B2:B{last})').font = B

# ── Todos los movimientos ──
ws = wb.create_sheet('Todos los movimientos')
cols = [('Movimiento (id)', 22), ('Nombre', 18), ('Tipo', 10), ('Origen', 22), ('Sprites / receta', 60), ('Fondo GBA', 18), ('Guion pret', 22)]
header(ws, cols)
chat_ids = {c['id'] for c in CHATGPT}
order = {'ChatGPT': 0, 'Compuesto (pret)': 1, 'pret': 2, 'pret (sin sprites)': 3, 'Variante -plus': 4}
out = []
for r in rows:
    if r['plus']:
        src, recipe = 'Variante -plus', f"la de {r['base']}, más intensa"
    elif r['id'] in chat_ids:
        src, recipe = 'ChatGPT', f"{INBOX}/{r['id']}.png + pret"
    elif r['id'] in COMPOSE:
        src, recipe = 'Compuesto (pret)', COMPOSE[r['id']]
    elif r['sprites'] or r['bgs']:
        src, recipe = 'pret', ', '.join(s.replace('sprites/', '') for s in r['sprites'])
    else:
        src, recipe = 'pret (sin sprites)', 'la GBA solo mueve, tiñe o sacude al Pokémon: se reproduce sin sprites'
    out.append((order[src], r['id'], r['name'], r['type'], src, recipe, ', '.join(r['bgs']), r['pret'] or ''))
missing = [r['id'] for r in rows if not r['plus'] and not r['pret'] and r['id'] not in chat_ids and r['id'] not in COMPOSE]
assert not missing, missing
for i, v in enumerate(sorted(out), 2):
    for j, x in enumerate(v[1:], 1):
        cell = ws.cell(row=i, column=j, value=x)
        cell.font = B
ws.auto_filter.ref = f'A1:G{len(out) + 1}'
counts = {}
for v in out:
    counts[v[4]] = counts.get(v[4], 0) + 1
print(counts)
wb.calculation.fullCalcOnLoad = True
wb.save(OUT)
