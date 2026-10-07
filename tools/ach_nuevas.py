"""Geolite - insignias de los logros nuevos (casino, continentes, Al otro lado del mundo, Con la guardia baja y Jubila al crupier).

Compone cada ilustracion de 48 px nativos con piezas que ya existen en assets/icons/ (continentes k_*, iconos del casino bet_*,
moneda, chistera y cara del crupier: NO se regenera al crupier) mas unas pocas piezas dibujadas aqui (cero verde, cielo estrellado,
cartel 177, reloj de oro, globo con chinchetas). Escribe assets/icons/ach_<id>.webp (384 px = 48 x 8, vecino mas cercano) y
assets/icons/blank_green.webp (la ficha del casino: la ficha roja pasada a verde). Es el punto de partida que se repasa a mano.

    python tools/ach_nuevas.py
"""
import json,base64,io,colorsys
from pathlib import Path

from PIL import Image,ImageDraw
I=str(Path(__file__).resolve().parent.parent/"assets"/"icons")+"/"
FR={"q":"blank_boss","level":"blank_boss","classic":"blank_small","codex":"blank_teal","adv":"blank_big","daily":"blank_gold"}
def ld(n,sz=None):
    i=Image.open(I+n+".webp").convert("RGBA")
    return i.resize((sz,sz),Image.NEAREST) if sz else i
def frame(name):
    return ld(name,64)
def hue_green():
    b=Image.open(I+"blank_boss.webp").convert("RGBA").resize((64,64),Image.NEAREST); px=b.load()
    for x in range(64):
        for y in range(64):
            r,g,bb,a=px[x,y]
            if a:
                h,s,v=colorsys.rgb_to_hsv(r/255,g/255,bb/255)
                if s>0.25: h=0.40
                r2,g2,b2=colorsys.hsv_to_rgb(h,s,v); px[x,y]=(int(r2*255),int(g2*255),int(b2*255),a)
    return b
GREEN=hue_green()
def badge(inner48,fr):
    f=fr.copy(); f.alpha_composite(inner48,(8,7)); return f
def inner_from(n):  # reuse a polished icon at 48 native
    return ld(n,48)
def to_b64(img,scale=4):
    im=img.resize((img.width*scale,img.height*scale),Image.NEAREST); b=io.BytesIO(); im.save(b,"PNG"); return "data:image/png;base64,"+base64.b64encode(b.getvalue()).decode()
def locked(img):
    g=img.copy(); px=g.load()
    for x in range(g.width):
        for y in range(g.height):
            r,gg,b,a=px[x,y]
            if a:
                l=int((r+gg+b)/3*.55); px[x,y]=(l,l,l,a)
    return g
# 3x5 pixel font
F={"0":["111","101","101","101","111"],"1":["010","110","010","010","111"],"7":["111","001","010","010","010"],"x":["101","101","010","101","101"]}
def text(img,s,x,y,col,out=(20,12,40,255),sc=1):
    d=ImageDraw.Draw(img); cx=x
    for ch in s:
        g=F[ch]
        for r,row in enumerate(g):
            for c,v in enumerate(row):
                if v=="1":
                    for dx in (-1,0,1):
                        for dy in (-1,0,1):
                            d.rectangle([cx+c*sc+dx,y+r*sc+dy,cx+c*sc+dx+sc-1,y+r*sc+dy+sc-1],fill=out)
        for r,row in enumerate(g):
            for c,v in enumerate(row):
                if v=="1": d.rectangle([cx+c*sc,y+r*sc,cx+c*sc+sc-1,y+r*sc+sc-1],fill=col)
        cx+=4*sc
def star(sz=12):
    s=ld("u_star",sz); return s
def disc(sz,fill,rim=(20,12,40,255)):
    im=Image.new("RGBA",(sz,sz),(0,0,0,0)); d=ImageDraw.Draw(im); d.ellipse([0,0,sz-1,sz-1],fill=rim); d.ellipse([1,1,sz-2,sz-2],fill=fill); return im
def paste(base,im,pos): base.alpha_composite(im,pos)
B={}  # id -> 48 inner, frame
def mk(id_,inner,fr): B[id_]=(inner,fr)
# casino_first
mk("casino_first",inner_from("bet_red"),GREEN)
# tour: 2x2 grid of game icons
t=Image.new("RGBA",(48,48),(0,0,0,0))
for k,n in enumerate(["bet_cups","bet_dados","bet_wheel","bet_rasca"]):
    paste(t,ld(n,24),((k%2)*24,(k//2)*24))
mk("casino_tour",t,GREEN)
# cero verde: roulette + green zero disc
c=inner_from("bet_red"); d=disc(22,(30,150,70,255)); text(d,"0",8,6,(255,255,255,255),sc=2) if False else None
paste(c,d,(26,26)); dd=ImageDraw.Draw(c)
text(c,"0",34,31,(255,255,255,255),sc=2) if False else None
# draw big 0 in 3x5 at sc2 centered in disc at (26,26)-(48,48): glyph 6x10 -> pos (34,31)
gl=F["0"]
for r,row in enumerate(gl):
    for cc,v in enumerate(row):
        if v=="1": dd.rectangle([34+cc*2,31+r*2,34+cc*2+1,31+r*2+1],fill=(255,255,255,255))
mk("casino_cero",c,GREEN)
# canto: coin on edge
mk("casino_canto",inner_from("coin_stand"),GREEN)
# espacial: night disc with stars + balloon
e=Image.new("RGBA",(48,48),(0,0,0,0)); dd=ImageDraw.Draw(e); dd.ellipse([1,1,46,46],fill=(20,12,40,255)); dd.ellipse([3,3,44,44],fill=(36,30,96,255))
for (x,y) in [(10,9),(36,12),(8,30),(40,32),(24,6),(30,40),(14,40),(40,22)]: dd.point((x,y),fill=(255,236,150,255))
for (x,y) in [(12,20),(34,26)]: dd.rectangle([x,y,x+1,y+1],fill=(255,255,255,255))
paste(e,ld("bet_globo",34),(7,4)); mk("casino_espacial",e,GREEN)
# banco: coin big + 177
bk=Image.new("RGBA",(48,48),(0,0,0,0)); paste(bk,ld("coin",36),(6,2)); paste(bk,ld("coin",22),(0,24)); paste(bk,ld("coin",22),(26,24))
dd=ImageDraw.Draw(bk); dd.rectangle([8,36,40,46],fill=(20,12,40,255)); dd.rectangle([9,37,39,45],fill=(60,36,10,255))
for k,ch in enumerate("177"):
    for r,row in enumerate(F[ch]):
        for cc,v in enumerate(row):
            if v=="1": dd.rectangle([14+k*8+cc*2,38+r*1,14+k*8+cc*2+1,38+r*1],fill=(255,206,70,255))
mk("casino_banco",bk,GREEN)
# continents
for cid,k in [("codex_eu","k_eu"),("codex_as","k_as"),("codex_af","k_af"),("codex_na","k_na"),("codex_sa","k_sa"),("codex_oc","k_oc")]:
    i=inner_from(k); paste(i,star(14),(34,0)); mk(cid,i,frame("blank_teal"))
# antipodas: globe + two pins
g=Image.new("RGBA",(48,48),(0,0,0,0)); dd=ImageDraw.Draw(g); dd.ellipse([3,3,44,44],fill=(20,12,40,255)); dd.ellipse([5,5,42,42],fill=(46,120,200,255))
for box in [(10,12,22,24),(24,26,36,36),(26,10,34,16),(11,30,17,36)]: dd.ellipse(box,fill=(80,180,90,255))
dd.ellipse([5,5,42,42],outline=(20,12,40,255)); 
for (x,y) in [(15,15),(33,33)]:
    dd.polygon([(x,y+10),(x-4,y),(x+4,y)],fill=(220,50,60,255)); dd.ellipse([x-4,y-4,x+4,y+4],fill=(220,50,60,255)); dd.rectangle([x-1,y-1,x,y],fill=(255,255,255,255))
dd.line([(15,25),(33,22)],fill=(255,255,255,255),width=1)
mk("antipodas",g,frame("blank_boss"))
# falso
mk("casino_falso",inner_from("dealer_laugh"),frame("blank_boss"))
# jubila: hat + watch + confetti
j=Image.new("RGBA",(48,48),(0,0,0,0)); dd=ImageDraw.Draw(j)
for (x,y,c) in [(6,6,(255,90,90)),(40,8,(90,200,255)),(10,36,(255,220,90)),(42,34,(120,230,140)),(24,3,(255,140,230)),(3,22,(255,220,90)),(45,20,(255,90,90))]: dd.rectangle([x,y,x+1,y+2],fill=c+(255,))
paste(j,ld("boss_hat",34),(7,2))
w=disc(18,(255,206,70,255)); wd=ImageDraw.Draw(w); wd.ellipse([3,3,14,14],fill=(255,244,200,255)); wd.line([(8,8),(8,4)],fill=(20,12,40,255)); wd.line([(8,8),(11,9)],fill=(20,12,40,255))
paste(j,w,(26,28)); dd=ImageDraw.Draw(j); dd.rectangle([34,25,35,27],fill=(20,12,40,255))
mk("adv_ascmax",j,frame("blank_big"))
for k,(inner,fr) in B.items():
    inner.resize((384,384),Image.NEAREST).save(I+"ach_"+k+".webp",lossless=True)
GREEN.resize((512,512),Image.NEAREST).save(I+"blank_green.webp",lossless=True)
print(len(B),"insignias + blank_green")
