#!/usr/bin/env python3
"""Generate abstract, clearly labeled engineering-type visual illustrations; NOT project photos."""
from pathlib import Path
import json, math
from html import escape
BASE=Path(__file__).resolve().parent.parent
OUT=BASE/'public'/'visual-templates'
OUT.mkdir(parents=True,exist_ok=True)
TYPES=[
('building','Buildings & housing','建筑与住宅'),
('industrial','Industrial buildings','工业厂房'),
('bridge','Bridges & viaducts','桥梁'),
('tunnel','Tunnels & underground','隧道及地下'),
('dam','Dams & hydropower','水坝水电'),
('energy','Power & energy','电力能源'),
('road','Highways & roads','公路'),
('rail','Rail & transit','铁路轨道'),
('port','Ports & marine','港口码头'),
('water','Water & wastewater','给排水'),
('precast','Precast concrete','预制混凝土'),
('geotech','Geotechnical & foundations','岩土与桩基'),
('general','Engineering project','通用工程')
]
PALETTES=[
('field','#102f38','#0e5765','#60d0c7','#f1ac67'),
('blueprint','#111f40','#1a4170','#71b9f3','#e5d5ae'),
('editorial','#263544','#536977','#f1c186','#99c9d3'),
('dusk','#252843','#445a79','#f8b66b','#99d8d2')]
def line(a,b,c,d,stroke,width=4,extra=''):
 return f'<path d="M{a} {b} L{c} {d}" stroke="{stroke}" stroke-width="{width}" fill="none" {extra}/>'
def rect(x,y,w,h,fill,stroke='none',sw=1,extra=''):
 return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>'
def poly(pts,fill,stroke='none',sw=1):
 return f'<polygon points="{pts}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
def ellipse(x,y,rx,ry,fill,stroke='none',sw=1):
 return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
def illustration(kind,palette):
 bg,shadow,light,accent=palette
 s=[]
 # universal stage and horizon
 s += [f'<path d="M0 480 L1200 405 L1200 675 L0 675Z" fill="{shadow}" opacity=".43"/>',line(0,480,1200,407,light,2,'opacity=".20"')]
 if kind in ('building','industrial'):
  s += [poly("320,480 675,390 905,445 560,547",shadow),poly("360,300 655,235 655,501 360,562",bg,light,3),poly("655,235 875,305 875,515 655,501",shadow,light,3),poly("360,300 655,235 875,305 580,368",light,light,2)]
  if kind=='industrial':
   s += [poly("360,300 445,230 515,296 590,225 655,235 580,368",accent),rect(397,430,145,125,shadow,light,3)]
   for z in range(5):s.append(line(680+z*30,305+z*6,680+z*30,472+z*4,accent,4))
  else:
   for row in range(4):
    for col in range(5):
     x=398+col*48; y=334+row*47-col*10
     s.append(poly(f"{x},{y} {x+31},{y-7} {x+31},{y+23} {x},{y+30}",light,'none'))
   for row in range(4):
    for col in range(3):
     x=699+col*48; y=329+row*43+col*14
     s.append(poly(f"{x},{y} {x+31},{y+10} {x+31},{y+39} {x},{y+29}",accent))
 elif kind=='bridge':
  s += [poly("85,405 1180,317 1180,384 85,472",shadow),poly("85,390 1180,302 1180,327 85,415",light)]
  for x,y in [(225,395),(565,367),(900,340)]:
   s += [poly(f"{x},{y} {x+60},{y-5} {x+63},550 {x+3},560",shadow,light,3)]
  s += [line(585,353,585,147,accent,11),line(585,147,180,398,accent,2),line(585,147,1012,322,accent,2)]
  for step in range(1,6):
   x=585-step*65;s.append(line(x,160+step*33,x,360+step*5,accent,2))
   x=585+step*75;s.append(line(x,160+step*28,x,360-step*5,accent,2))
 elif kind=='tunnel':
  s += [poly("150,550 1050,500 1060,570 150,615",shadow),f'<path d="M270 545 Q275 165 610 160 Q970 165 930 520 L930 570 L270 592 Z" fill="{shadow}" stroke="{light}" stroke-width="10"/>',
        f'<path d="M356 545 Q363 275 610 262 Q862 269 846 520 L846 560 L356 570Z" fill="{bg}" stroke="{accent}" stroke-width="4"/>']
  for z in range(5):
   s.append(f'<path d="M{290+z*28} {548-z*10} Q{330+z*35} {200+z*15} 610 {180+z*16}" fill="none" stroke="{light}" stroke-width="3" opacity=".5"/>')
  s += [line(390,535,574,326,accent,6),line(830,532,648,326,accent,6),ellipse(610,340,85,85,light,accent,6),ellipse(610,340,42,42,shadow)]
 elif kind=='dam':
  s += [poly("0,498 1150,442 1200,485 0,556",light),poly("325,304 844,218 889,490 306,565",shadow,light,4),poly("325,304 844,218 825,287 310,383",accent)]
  for i in range(4):
   x=400+i*102;s += [poly(f"{x},352 {x+47},344 {x+45},515 {x-4},524",bg,accent,2),ellipse(x+20,518,23,7,light)]
  for i in range(7):
   y=540+i*20;s += [f'<path d="M0 {y} Q80 {y-20} 180 {y} T410 {y-5} " fill="none" stroke="{accent}" stroke-width="4" opacity=".7"/>']
 elif kind=='energy':
  s += [poly("220,511 925,434 990,515 255,600",shadow),rect(330,331,370,185,shadow,light,3),poly("330,331 695,310 800,368 450,394",accent)]
  for x in [400,552,712]:
   s += [poly(f"{x},311 {x+53},310 {x+84},153 {x+22},163",light),ellipse(x+54,153,33,13,accent)]
  for x in [812,897]:
   s += [line(x,356,x,183,light,9),line(x-30,210,x+30,210,accent,4)]
 elif kind=='road':
  s += [poly("510,204 683,191 1140,580 1140,675 0,675 0,590",shadow),poly("534,209 663,203 1040,655 144,655",light),poly("573,210 611,207 663,650 551,650",bg)]
  for z in range(8):
   y=253+z*z*7;s.append(line(587,y,592,y+max(4,z*4),accent,2+z*.25))
  s += [line(150,611,490,214,accent,5),line(1077,618,692,214,accent,5)]
 elif kind=='rail':
  s += [poly("510,206 690,205 1140,665 0,665",shadow)]
  for x1,x2 in [(568,162),(632,1038)]:
   s.append(line(x1,218,x2,647,light,11))
  for z in range(12):
   y=243+z*z*3.4;delta=10+z*z*4
   s.append(line(600-delta,y,600+delta,y+3,accent,5))
  s += [poly("480,315 725,305 800,437 400,443",light),poly("495,327 701,320 724,387 470,395",bg)]
 elif kind=='port':
  s += [poly("0,535 1200,484 1200,675 0,675",shadow)]
  for x in [400,740]:
   s += [line(x,440,x,148,light,13),line(x-80,170,x+230,170,accent,9),line(x+130,169,x+130,353,accent,3),poly(f"{x-50},435 {x+42},435 {x+45},470 {x-66},470",shadow)]
  s += [poly("280,505 925,470 852,559 360,592",light),poly("385,463 615,450 650,505 380,520",accent)]
  for i in range(5):s.append(rect(415+i*85,417,70,45,shadow,light,2))
 elif kind=='water':
  s += [poly("190,502 945,411 1020,530 260,615",shadow)]
  for x,y in [(390,393),(635,364),(810,341)]:
   s += [ellipse(x,y,130,65,light),ellipse(x,y+30,130,65,shadow,light,4),rect(x-130,y,260,31,shadow),ellipse(x,y,124,58,bg,accent,5)]
   for z in [-40,20,75]:s.append(f'<path d="M{x+z-32} {y} Q{x+z} {y-14} {x+z+32} {y}" fill="none" stroke="{accent}" stroke-width="3"/>')
  s += [line(400,492,540,474,accent,12),line(540,474,540,418,accent,12)]
 elif kind=='precast':
  s += [poly("130,545 1000,462 1060,555 170,639",shadow)]
  for i in range(4):
   x=340+i*60;y=425+i*27
   s += [poly(f"{x-130},{y} {x+130},{y-25} {x+190},{y+7} {x-69},{y+37}",light,accent,2),poly(f"{x-69},{y+37} {x+190},{y+7} {x+190},{y+42} {x-69},{y+68}",shadow,accent,2)]
  s += [line(802,145,802,444,accent,8),line(700,171,1010,171,accent,8),line(900,173,900,399,accent,3)]
 elif kind=='geotech':
  s += [poly("80,432 1150,388 1150,675 80,675",shadow),poly("80,472 1150,429 1150,510 80,556",light),poly("80,558 1150,509 1150,620 80,665",bg)]
  for x in [350,620,845]:
   s += [rect(x,390,54,235,accent),rect(x+10,390,10,235,light),ellipse(x+27,620,40,14,light)]
  s += [poly("535,201 562,201 716,418 678,419",light),line(548,201,710,416,accent,5),line(555,200,457,423,accent,5),line(489,416,691,411,light,9)]
 else:
  s += [poly("220,492 580,275 937,406 571,606",shadow,light,3),poly("220,492 580,275 587,340 220,557",light),poly("580,275 937,406 930,471 587,340",accent),line(500,242,820,349,light,9),line(580,222,580,584,accent,8)]
 # technical ticks and framing
 s += [line(80,130,280,130,light,2,'opacity=".4"'),line(80,130,80,224,light,2,'opacity=".4"'),line(1080,460,1080,558,light,2,'opacity=".4"'),line(890,558,1080,558,light,2,'opacity=".4"')]
 return ''.join(s)
manifest=[]
for kind,en,zh in TYPES:
 safe_en=escape(en,quote=True)
 for i,(style,bg,shadow,light,accent) in enumerate(PALETTES,1):
  fname=f'{kind}-{style}.svg'
  content=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" role="img" aria-label="{safe_en} generic technical illustration, not actual site photograph">
<title>{safe_en} — Concept illustration, not a real project photograph</title>
<defs><linearGradient id="g" x2=".9" y2="1"><stop stop-color="{bg}"/><stop offset="1" stop-color="{shadow}"/></linearGradient>
<pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="{light}" stroke-opacity=".08"/></pattern></defs>
<rect width="1200" height="675" fill="url(#g)"/><rect width="1200" height="675" fill="url(#grid)"/>
<circle cx="920" cy="150" r="245" stroke="{light}" stroke-opacity=".08" stroke-width="35" fill="none"/>
{illustration(kind,(bg,shadow,light,accent))}
<path d="M50 49H145 M50 49V110 M1150 629H1055 M1150 629V569" stroke="{light}" stroke-width="2" opacity=".5"/>
</svg>'''
  (OUT/fname).write_text(content,encoding="utf-8")
  manifest.append({'id':f'{kind}-{style}','category':kind,'style':style,'image':f'/visual-templates/{fname}','illustrativeOnly':True,'source':'AI-assisted deterministic vector template','notSitePhoto':True})
(OUT/'manifest.json').write_text(json.dumps({'schemaVersion':'source-rating-visuals/1.0','count':len(manifest),'disclosure':'All assets are generic type illustrations, not photographs of the referenced project.','templates':manifest},ensure_ascii=False,indent=2),encoding='utf-8')
print('CREATED',len(manifest),'GENERIC_VISUAL_TEMPLATES',len(TYPES),'CATEGORIES',len(PALETTES),'STYLES')

