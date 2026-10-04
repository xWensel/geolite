/*
 * Geolite - visor del mapa (v0.3, WebGL2).
 *
 *  El mapa se dibuja SIEMPRE como vector puro en la GPU, en cada frame y a la resolucion real de la pantalla:
 *    - Los paises se trianguian una sola vez (earcut) y viven en buffers de la GPU.
 *    - Las fronteras son segmentos instanciados con ancho constante en pixeles (nitidos a cualquier zoom).
 *    - El resplandor de costas y el sombreado de litoral salen de una silueta desenfocada en la GPU (ancho constante en pantalla).
 *    - La retícula (grados) se calcula en el shader con antialiasing exacto y fundido entre niveles de detalle.
 *    - Post-proceso "sensorial": desenfoque radial + aberracion cromatica segun la velocidad de zoom, viñeta y grano.
 *  Camara con fisica: zoom suavizado hacia el cursor, inercia al soltar y velocidades para efectos y sonido.
 *  Si no hay WebGL2 se usa MapView2D (map2d.js).
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const { project, unproject, D2R } = A.geo;
  const BX0 = -Math.PI, BX1 = Math.PI, BY0 = -1.5, BY1 = 2.1;
  /* marco de un punto en el mapa deformado: el continente (0-5; 6 = el resto) y, si viene de un clic, la vuelta al mundo de la copia tocada,
     con la misma cuenta que los vertices de la GPU: ct + 8 * (vuelta + 2). Sin vuelta (t null), el punto se envuelve al lado visible del mundo */
  const frameOf = ct => (ct == null ? [null, null] : ct < 8 ? [ct, null] : [ct % 8, Math.floor(ct / 8) - 2]);
  const TWO_PI = Math.PI * 2;
  const FLAG_EXT = 18;                                     // v0.2.15: celdas que se alarga el mastil de la bandera del acierto (lo que sube la tela)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOutBounce = t => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  };
  const fmtCoord = (v, pos, neg) => Math.abs(v).toFixed(2) + "°" + (v >= 0 ? pos : neg);
  const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

  /* ------------------------------------------------------------------ estilos de mapa (lo eligen los skins) */
  A.MAPSTYLES = A.MAPSTYLES || {};
  A.MAPSTYLES.expedicion = {
    style: 0, oceanTop: "#15495a", oceanBot: "#082330", shallow: "#3a97a0",
    land: ["#efe5cc", "#e3d4ac", "#d5dbb7", "#e9c3a5", "#dbcdb8", "#cdd9c6", "#f4efe3"],
    line: [0.15, 0.2, 0.23, 0.5], lineW: 1.15, lineOff: [0, 0], lineOffCol: [0, 0, 0, 0],
    grid: "#bee1e6", gridA: 0.2, tropic: "#ffd68c",
    ao: 0.16, grain: 0.03, vignette: 0.42, postGrain: 0.035, tint: [1, 1, 1],
    ink: "#14232b", paper: "#f2e9d6", red: "#e0492b", brass: "#c8963e", hl: "#e0492b",
  };

  /* ------------------------------------------------------------------ shaders */
  /* deformaciones de los retos: cada continente puede girar sobre su centro, encogerse y desplazarse (Pangea, Big bang, Continentes torcidos).
     ct lleva el continente (0-6) y, en ct/8, la vuelta al mundo de esa copia del poligono respecto a la suya propia (2 = la propia; 1 y 3 = una vuelta
     a cada lado). Las copias que cruzan el antimeridiano se mueven CON su original (antes giraban y se encogian alrededor del centro del
     continente desde el otro lado del mundo y aparecia una Rusia fantasma encima de Europa) */
  /* giro del mapa entero (Ruleta, Mundo del reves, Espejo): se aplica a la geometria, en pixeles del objetivo y alrededor de su centro, no a la imagen
     final. Antes el post-proceso giraba la foto entera del mapa y se veia el rectangulo girando con esquinas negras y el degradado del oceano torcido;
     ahora el fondo se queda quieto llenando la pantalla y solo gira el mapa. Es la inversa exacta de _orientOut (lo que se ve es lo que se toca).
     u_ori: (cos, sin, escala x del espejo, activo) */
  const ORI = `
uniform vec4 u_ori;
vec2 orp(vec2 p){ if(u_ori.w<0.5) return p; p.x/=u_ori.z; return vec2(u_ori.x*p.x-u_ori.y*p.y, u_ori.y*p.x+u_ori.x*p.y); }
vec2 ori_inv(vec2 p){ if(u_ori.w<0.5) return p; p=vec2(u_ori.x*p.x+u_ori.y*p.y, -u_ori.y*p.x+u_ori.x*p.y); p.x*=u_ori.z; return p; }`;
  const DISTORT = `
uniform vec2 u_dsh[8]; uniform float u_drot[8]; uniform vec2 u_dcen[8]; uniform float u_dsc[8];
vec2 xf(vec2 a, float ct){ int code=int(ct+0.5); int w=code/8; int c=code-w*8; vec2 o=vec2(float(w-2)*6.283185307179586,0.0); vec2 cen=u_dcen[c]; vec2 d=a-o-cen; float ca=cos(u_drot[c]), sa=sin(u_drot[c]); return cen+u_dsc[c]*vec2(ca*d.x-sa*d.y, sa*d.x+ca*d.y)+u_dsh[c]+o; }
${ORI}`;
  const VS_FILL = `#version 300 es
layout(location=0) in vec2 a_pos; layout(location=1) in float a_ci; layout(location=2) in float a_ct;
uniform vec2 u_center; uniform float u_scale; uniform vec2 u_res; uniform vec2 u_off;
${DISTORT}
flat out float v_ci;
void main(){ vec2 p=orp((xf(a_pos,a_ct)-u_center)*u_scale)+u_off; gl_Position=vec4(p/(0.5*u_res),0.0,1.0); v_ci=a_ci; }`;

  const FS_SIL = `#version 300 es
precision mediump float; out vec4 o; void main(){ o=vec4(1.0); }`;
  const FS_SOLID = `#version 300 es
precision mediump float; uniform vec4 u_col; out vec4 o; void main(){ o=u_col; }`;

  const NOISE = `
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }`;

  /* tierra: color de paleta + sombreado de litoral + tratamiento propio de cada skin */
  const FS_LAND = `#version 300 es
precision highp float;
flat in float v_ci;
uniform vec3 u_pal[8]; uniform vec2 u_res; uniform sampler2D u_blurN; uniform vec4 u_fx; uniform int u_style; uniform float u_dpr;
uniform float u_flat; uniform vec3 u_flatc; uniform vec3 u_lens;   // mapa mudo: todos los paises del mismo color (salvo dentro de la lupa)
out vec4 o;
${NOISE}
void main(){
  vec3 c=u_pal[int(v_ci+0.5)];
  vec2 uv=gl_FragCoord.xy/u_res; vec2 f=gl_FragCoord.xy;
  if(u_flat>0.001){ float fl=u_flat; if(u_lens.z>0.5){ fl*=smoothstep(u_lens.z-6.0,u_lens.z,length(f-u_lens.xy)); } c=mix(c,u_flatc,fl); }
  float n=texture(u_blurN,uv).r;
  float ao=smoothstep(0.60,0.97,n);
  c*=mix(1.0-u_fx.x,1.0,ao);
  if(u_style==1){                                   // casino: cara de carta con brillo suave
    c*=1.0+0.05*uv.y; c=mix(c,vec3(1.0),0.05*smoothstep(0.6,1.0,n));
  }
  c+=(hash(f)-0.5)*u_fx.y;
  o=vec4(c,1.0);
}`;

  const FS_HATCH = `#version 300 es
precision highp float;
flat in float v_ci; uniform vec3 u_col; uniform float u_dpr; uniform float u_alpha;
out vec4 o;
void main(){
  float s=step(0.5,fract((gl_FragCoord.x+gl_FragCoord.y)/(9.0*u_dpr)));
  float a=(0.22+0.55*s)*u_alpha;
  o=vec4(u_col*a,a);
}`;

  const VS_LINE = `#version 300 es
layout(location=0) in vec2 a_q; layout(location=1) in vec4 a_seg; layout(location=2) in float a_sct; layout(location=3) in float a_brd;
uniform vec2 u_center; uniform float u_scale; uniform vec2 u_res; uniform float u_width; uniform vec2 u_off;
uniform float u_wob; uniform float u_wt;
${DISTORT}
out float v_d; out float v_hw; out float v_brd;
vec2 wob(vec2 p){ return u_wob*vec2(sin(p.y*9.0+p.x*3.7+u_wt), cos(p.x*8.0-p.y*4.3+u_wt*1.3)) + u_wob*0.5*vec2(sin(p.y*23.0+u_wt*0.7), cos(p.x*19.0-u_wt*0.9)); }
void main(){
  vec2 p0=orp((xf(a_seg.xy+wob(a_seg.xy)*a_brd,a_sct)-u_center)*u_scale)+u_off, p1=orp((xf(a_seg.zw+wob(a_seg.zw)*a_brd,a_sct)-u_center)*u_scale)+u_off;   // solo las fronteras interiores bailan: las costas quedan fijas
  vec2 dir=p1-p0; float len=length(dir); dir=len>0.0001?dir/len:vec2(1.0,0.0);
  vec2 nrm=vec2(-dir.y,dir.x);
  float hw=u_width*0.5+1.0;
  vec2 p=mix(p0,p1,a_q.x)+dir*(a_q.x*2.0-1.0)*hw+nrm*a_q.y*hw;
  v_d=a_q.y*hw; v_hw=u_width*0.5; v_brd=a_brd;
  gl_Position=vec4(p/(0.5*u_res),0.0,1.0);
}`;
  const FS_LINE = `#version 300 es
precision highp float; in float v_d; in float v_hw; in float v_brd; uniform vec4 u_col; uniform float u_lineA; uniform vec3 u_lens; uniform float u_lmode; out vec4 o;
void main(){ float a=clamp(v_hw-abs(v_d)+0.5,0.0,1.0); float m=1.0; if(u_lmode>0.5){ float inl=1.0-smoothstep(u_lens.z-6.0,u_lens.z,length(gl_FragCoord.xy-u_lens.xy)); m=u_lmode<1.5?1.0-inl:inl; } o=vec4(u_col.rgb,u_col.a*a*mix(1.0,u_lineA,v_brd)*m); }`;   // Mapa mudo: solo desaparecen las fronteras interiores (a_brd=1); las costas siempre se ven

  const VS_FULL = `#version 300 es
void main(){ vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2)); gl_Position=vec4(p*2.0-1.0,0.0,1.0); }`;

  const FS_BLUR = `#version 300 es
precision mediump float; uniform sampler2D u_tex; uniform vec2 u_dir; uniform vec2 u_res; out vec4 o;
void main(){
  vec2 uv=gl_FragCoord.xy/u_res; float w[5]=float[5](0.2270,0.1945,0.1216,0.0540,0.0162); float s=texture(u_tex,uv).r*w[0];
  for(int i=1;i<5;i++){ s+=texture(u_tex,uv+u_dir*float(i)).r*w[i]; s+=texture(u_tex,uv-u_dir*float(i)).r*w[i]; }
  o=vec4(s,s,s,1.0);
}`;

  /* oceano: degradado + aguas someras + reticula con LOD; casino = remolino animado */
  const FS_OCEAN = `#version 300 es
precision highp float;
uniform vec2 u_center; uniform float u_scale; uniform vec2 u_res; uniform float u_dpr; uniform float u_time; uniform int u_style;
uniform sampler2D u_blurN; uniform sampler2D u_blurW; uniform sampler2D u_swirl;
uniform vec3 u_oTop; uniform vec3 u_oBot; uniform vec3 u_shallow; uniform vec3 u_grid; uniform vec3 u_tropic;
uniform vec3 u_sw1; uniform vec3 u_sw2; uniform vec3 u_sw3;
uniform vec4 u_gp; // stepA, stepB, tB, gridAlpha
out vec4 o;
const float D2R=0.017453292519943295;
${NOISE}
${ORI}
float lineAlpha(float dpx){ return clamp(0.5*u_dpr*1.2+0.5-dpx,0.0,1.0); }
float gridLevel(float stp, vec2 wp, float lonDeg, float latDeg, float pxPerDeg){
  float dl=abs(mod(lonDeg+stp*0.5,stp)-stp*0.5);
  float lonLine=floor(lonDeg/stp+0.5)*stp;
  float k=floor(latDeg/stp+0.5); float latLine=k*stp;
  float dLat=1e6; float majLat=0.0;
  if(abs(latLine)<89.9){ float yL=1.25*log(tan(0.78539816339+0.4*latLine*D2R)); dLat=abs(wp.y-yL)*u_scale; majLat=step(abs(mod(latLine+15.0,30.0)-15.0),0.001); }
  float majLon=step(abs(mod(lonLine+15.0,30.0)-15.0),0.001);
  float a=lineAlpha(dl*pxPerDeg)*(0.45+0.55*majLon);
  float b=lineAlpha(dLat)*(0.45+0.55*majLat);
  return max(a,b);
}
void main(){
  vec2 frag=gl_FragCoord.xy; vec2 uv=frag/u_res;
  vec2 sfr=ori_inv(frag-0.5*u_res)+0.5*u_res;                    // el mismo punto en el mapa sin girar: reticula y tropicos giran con el mapa; degradado, brillo y remolino se quedan quietos
  vec2 wp=u_center+(sfr-0.5*u_res)/u_scale;
  float lonDeg=wp.x/D2R; float latDeg=degrees(2.5*(atan(exp(0.8*wp.y))-0.78539816339));
  float pxPerDeg=u_scale*D2R;
  vec3 ocean=mix(u_oBot,u_oTop,uv.y);
  float r=length((uv-vec2(0.5,0.55))*vec2(u_res.x/u_res.y,1.0));
  ocean+=0.06*exp(-r*r*3.0);
  float w=texture(u_blurW,uv).r; float n=texture(u_blurN,uv).r;
  float shal=clamp(smoothstep(0.03,0.42,w)*0.70+smoothstep(0.02,0.5,n)*0.30,0.0,1.0);
  if(u_style==1){ ocean=texture(u_swirl,uv).rgb; ocean=mix(ocean,u_shallow,shal*0.55); }
  else ocean=mix(ocean,u_shallow,shal);
  // reticula con dos niveles de detalle fundidos
  float ga=gridLevel(u_gp.x,wp,lonDeg,latDeg,pxPerDeg);
  float gb=gridLevel(u_gp.y,wp,lonDeg,latDeg,pxPerDeg)*u_gp.z;
  float g=max(ga,gb)*u_gp.w;
  ocean=mix(ocean,u_grid,g);
  // ecuador y tropicos punteados
  float dash=step(0.5,fract(sfr.x/(11.0*u_dpr)));
  float dE=abs(wp.y)*u_scale;
  float yT=1.25*log(tan(0.78539816339+0.4*23.4366*D2R));
  float dT=min(abs(wp.y-yT),abs(wp.y+yT))*u_scale;
  float t2=max(lineAlpha(dE),lineAlpha(dT))*dash*0.55*step(0.001,u_gp.w);
  ocean=mix(ocean,u_tropic,t2);
  ocean+=(hash(frag*0.91)-0.5)*0.014;
  o=vec4(ocean,1.0);
}`;

  /* fondo animado (remolino): se pinta a baja resolucion y ~24 fps en su propia textura; el oceano solo la lee */
  const FS_SWIRL = `#version 300 es
precision highp float;
uniform vec2 u_res; uniform float u_time; uniform vec3 u_sw1; uniform vec3 u_sw2; uniform vec3 u_sw3; out vec4 o;
/* remolino de pintura (inspirado en los fondos de los juegos de cartas): giro + deformacion iterada */
vec3 swirl(vec2 frag){
  float t=u_time;
  vec2 uv=(frag-0.5*u_res)/u_res.y*2.4;
  float len=length(uv);
  float ang=atan(uv.y,uv.x)+(1.9+0.3*sin(t*0.13))*len-t*0.32;
  vec2 u=vec2(len*cos(ang),len*sin(ang))-vec2(1.0);
  vec2 u2=u;
  for(int i=0;i<5;i++){
    u2+=vec2(sin(u2.y*1.25+t*0.35+float(i)),cos(u2.x*1.05-t*0.28+float(i)*1.7))*0.55;
    u+=0.42*vec2(cos(u2.y+t*0.21),sin(u2.x-t*0.24));
    u-=cos(u.x+u.y)-sin(u.x*0.711-u.y);
  }
  float p=clamp(length(u)*0.32,0.0,1.0);
  float band=0.5+0.5*sin(p*9.42+t*0.45);
  vec3 col=mix(u_sw1,u_sw2,smoothstep(0.15,0.85,band));
  col=mix(col,u_sw3,smoothstep(0.55,1.0,p)*0.55);
  return col;
}
void main(){ o=vec4(swirl(gl_FragCoord.xy),1.0); }`;

  /* post-proceso: efecto de zoom sensorial + (casino) monitor CRT + viñeta y grano */
  const FS_POST = `#version 300 es
precision highp float;
uniform sampler2D u_scene; uniform vec2 u_res; uniform vec2 u_zc; uniform float u_zv; uniform vec2 u_pv; uniform float u_vig; uniform float u_grain; uniform vec3 u_tint; uniform float u_time;
uniform float u_crt; uniform float u_dpr; uniform float u_lite;
out vec4 o;
${NOISE}
void main(){
  vec2 frag=gl_FragCoord.xy; vec2 uv=frag/u_res;
  if(u_crt>0.5){ vec2 q=uv*2.0-1.0; q*=1.0+dot(q,q)*0.045; uv=q*0.5+0.5; }
  vec2 suv=uv;                                                  // la escena ya viene girada (Ruleta, Mundo del reves): aqui solo la curva CRT
  float inside=step(0.0,suv.x)*step(suv.x,1.0)*step(0.0,suv.y)*step(suv.y,1.0);
  vec2 fr=uv*u_res;
  vec2 toC=(u_zc-fr);
  float zvA=clamp(u_zv,-4.0,4.0);
  vec2 off=toC*zvA*0.018+u_pv*0.004;                            // estela de movimiento sutil (antes era tan fuerte que parecia lag)
  float lenPx=length(off);
  if(lenPx>12.0*u_dpr) off*=12.0*u_dpr/lenPx;
  vec3 col;
  if(lenPx<0.6){ col=texture(u_scene,suv).rgb; }
  else {
    col=vec3(0.0); const int N=12;
    for(int i=0;i<N;i++){ float t=float(i)/float(N-1)-0.5; col+=texture(u_scene,suv+off*t/u_res).rgb; }
    col/=float(N);
  }
  float ca=min(lenPx,12.0)*0.00035+u_crt*0.0011*(1.0-u_lite);
  if(ca>0.0005){
    vec2 dir=normalize(toC+vec2(0.0001)); vec2 cav=dir*ca*u_res.y/u_res*0.5;
    col.r=texture(u_scene,suv+cav).r; col.b=texture(u_scene,suv-cav).b;
  }
  if(u_crt>0.5){
    float sl=0.5+0.5*sin(fr.y*3.14159265/(1.5*u_dpr));
    col*=0.90+0.10*sl;                                          // lineas de barrido
    float tri=fract(fr.x/(3.0*u_dpr)); col*=0.965+0.035*vec3(step(tri,0.34),step(0.34,tri)*step(tri,0.67),step(0.67,tri));   // mascara RGB
    if(u_lite<0.5){ vec3 bl=vec3(0.0); for(int i=0;i<6;i++){ float a=float(i)*1.0472; bl+=texture(u_scene,suv+vec2(cos(a),sin(a))*3.5*u_dpr/u_res).rgb; } bl/=6.0;
    col+=max(bl-0.72,0.0)*0.55; }                                 // resplandor de fosforo
    }
  vec2 q2=uv-0.5; float v=1.0-u_vig*smoothstep(0.30,0.95,length(q2*vec2(1.05,1.0))+min(abs(zvA)*0.01,0.04));
  col*=v*u_tint;
  col+=(hash(frag+fract(floor(u_time*8.0)*0.137)*61.0)-0.5)*u_grain;   // grano a ~8 fps: cine, no vibracion
  o=vec4(col*inside,1.0);
}`;

  const VS_LABEL = null;

  const earcutFn = () => (typeof window.earcut === "function" ? window.earcut : window.earcut && window.earcut.default);

  function compile(gl, vs, fs) {
    const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) + "\n" + s.slice(0, 200)); return sh; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    p.u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); p.u[info.name.replace("[0]", "")] = gl.getUniformLocation(p, info.name); }
    return p;
  }
  function buildPrograms(gl) {
    return {
      sil: compile(gl, VS_FILL, FS_SIL), solid: compile(gl, VS_FILL, FS_SOLID), land: compile(gl, VS_FILL, FS_LAND), hatch: compile(gl, VS_FILL, FS_HATCH),
      line: compile(gl, VS_LINE, FS_LINE), blur: compile(gl, VS_FULL, FS_BLUR), ocean: compile(gl, VS_FULL, FS_OCEAN), post: compile(gl, VS_FULL, FS_POST), swirl: compile(gl, VS_FULL, FS_SWIRL),
    };
  }

  /* ================================================================== sondas (Sonar y Brujula), para el mapa de la GPU y el de respaldo 2D */
  /* cada sonda conserva el momento en que aparecio (antes, cada sonda nueva hacia crecer y rebotar otra vez todos los anillos) */
  const keepT0 = (old, list) => { const now = performance.now(); return list.map((p, i) => ({ ...p, t0: old && old[i] && old[i].lon === p.lon && old[i].lat === p.lat ? old[i].t0 : now })); };
  A.keepT0 = keepT0;
  const R_KM = 6371, destLL = (lat, lon, brg, km) => { const d = km / R_KM, la = lat * D2R, lo = lon * D2R, b = brg * D2R; const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b)); const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2)); return [((lo2 / D2R + 540) % 360) - 180, la2 / D2R]; };
  const rgbaOf = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  /* Cada sonda se dibuja entera en el marco del clic (p.ct): con los continentes movidos el anillo sale redondo alrededor de donde tocaste. La
     etiqueta va junto a su marcador (fuera del anillo si este es pequeño; en la Brujula, al otro lado de la flecha) y se aparta de las demas:
     antes iba en el punto norte del anillo, que a menudo era justo el objetivo, y varias se apilaban. Encima del objetivo (p.inside) no hay
     anillo ni flecha: el marcador late y dice "¡Dentro del pais!" (antes no se veia nada). Devuelve true si hay que seguir dibujando */
  A.drawProbes = (map, c, now) => {
    const sk = map.sk || {}, ink = sk.ink || "#14232b", brass = sk.brass || "#c8963e", font = `600 13px ${map._fm ? map._fm() : "'DM Mono', monospace"}`;
    const P = map.probes.map(p => map.lonLatToScreen(p.lon, p.lat, p.ct == null ? 6 : p.ct)), labels = [];
    const taken = (map.avoid || []).concat(P.map(q => [q[0] - 11, q[1] - 11, q[0] + 11, q[1] + 11]));   // map.avoid: el HUD (lo pone la Aventura al sondear)
    let anim = false;
    map.probes.forEach((p, idx) => {
      const k = clamp((now - p.t0) / 700, 0, 1), e = easeOutBounce(k), P0 = P[idx]; if (k < 1) anim = true;
      let R = 0, dir = null;
      c.save(); c.lineJoin = "round";
      if (p.dr) {                                                        // continentes movidos: circulo en el mapa que ves, alrededor del marcador y por el objetivo
        const W0 = map.sceneOf(p.lon, p.lat, p.ct), r = p.dr * k; c.beginPath();
        for (let i = 0; i <= 96; i++) { const t = (i / 96) * Math.PI * 2, q = map.toScreen(W0[0] + Math.cos(t) * r, W0[1] + Math.sin(t) * r); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); R = Math.max(R, Math.hypot(q[0] - P0[0], q[1] - P0[1])); }
        c.setLineDash([10, 8]); c.lineDashOffset = -now / 60; c.lineWidth = 5; c.strokeStyle = rgbaOf(ink, 0.75); c.stroke();
        c.lineWidth = 2.2; c.strokeStyle = rgbaOf(brass, 0.95); c.stroke(); c.fillStyle = rgbaOf(brass, 0.07); c.fill();
        anim = true;
      } else if (p.km) {
        c.beginPath(); let prev = null, split = false;
        for (let i = 0; i <= 96; i++) {
          const [lo, la] = destLL(p.lat, p.lon, (i / 96) * 360, p.km * k), q = map.lonLatToScreen(lo, la, p.ct == null ? 6 : p.ct);   // sin marco (mapa sin continentes movidos): sin mover, sin buscar el continente de cada punto en cada fotograma
          if (!prev || Math.abs(q[0] - prev[0]) > map.W * 0.6) { if (prev) split = true; c.moveTo(q[0], q[1]); } else c.lineTo(q[0], q[1]);
          prev = q; R = Math.max(R, Math.hypot(q[0] - P0[0], q[1] - P0[1]));
        }
        c.setLineDash([10, 8]); c.lineDashOffset = -now / 60; c.lineWidth = 5; c.strokeStyle = rgbaOf(ink, 0.75); c.stroke();
        c.lineWidth = 2.2; c.strokeStyle = rgbaOf(brass, 0.95); c.stroke();
        if (!split && Math.abs(p.lat) + p.km / 111 < 89) { c.fillStyle = rgbaOf(brass, 0.07); c.fill(); }   // si rodea un polo o se parte en el antimeridiano, sin relleno (rellenaba la zona de fuera)
        anim = true;                                                     // el borde discontinuo se mueve
      }
      if (p.bearing != null) {                                           // rumbo medido en el mapa que ves (p.bearing: grados desde el norte del mapa)
        const W0 = map.sceneOf(p.lon, p.lat, p.ct == null ? 6 : p.ct), b = p.bearing * D2R, F = map.toScreen(W0[0] + Math.sin(b) * 0.3, W0[1] + Math.cos(b) * 0.3);
        let dx = F[0] - P0[0], dy = F[1] - P0[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L; dir = [dx, dy];
        const len = 76 * e, x2 = P0[0] + dx * len, y2 = P0[1] + dy * len, nx = -dy, ny = dx;
        c.setLineDash([]); c.lineCap = "round"; c.lineWidth = 8; c.strokeStyle = rgbaOf(ink, 0.85); c.beginPath(); c.moveTo(P0[0], P0[1]); c.lineTo(x2, y2); c.stroke();
        c.lineWidth = 4; c.strokeStyle = brass; c.stroke();
        c.fillStyle = brass; c.strokeStyle = rgbaOf(ink, 0.85); c.lineWidth = 2.4; c.beginPath(); c.moveTo(x2 + dx * 14, y2 + dy * 14); c.lineTo(x2 + nx * 10, y2 + ny * 10); c.lineTo(x2 - nx * 10, y2 - ny * 10); c.closePath(); c.stroke(); c.fill();
        R = len + 14; for (let s = 12; s <= len + 14; s += 10) { const sx = P0[0] + dx * s, sy = P0[1] + dy * s; taken.push([sx - 8, sy - 8, sx + 8, sy + 8]); }   // la flecha ocupa sitio: la etiqueta no se le monta encima
      }
      if (p.inside) { const t = (now / 1000) % 1; c.setLineDash([]); c.strokeStyle = rgbaOf(brass, 0.9 * (1 - t)); c.lineWidth = 3; c.beginPath(); c.arc(P0[0], P0[1], 9 + t * 26, 0, Math.PI * 2); c.stroke(); anim = true; }
      c.setLineDash([]); c.fillStyle = ink; c.strokeStyle = brass; c.lineWidth = 2.6; c.beginPath(); c.arc(P0[0], P0[1], 7 * e, 0, Math.PI * 2); c.fill(); c.stroke();
      c.restore();
      if (p.label && k >= 1) labels.push({ p, P0, R, dir });
    });
    /* etiquetas encima de todo, cada una en el primer sitio libre junto a su marcador */
    if (labels.length) { if (map._setFont) map._setFont(c, font); else c.font = font; }
    const W = map.W, H = map.H, hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
    for (const { p, P0, R, dir } of labels) {
      const w = c.measureText(p.label).width + 22, h = 28, off = p.km && R < 64 ? Math.max(26, R + 20) : 26;
      const back = dir ? [[Math.abs(dir[0]) > 0.3 ? -Math.sign(dir[0]) * (w / 2 + 14) : 0, Math.abs(dir[1]) > 0.3 ? -Math.sign(dir[1]) * (h / 2 + 14) : 0]] : [];   // Brujula: al otro lado de la flecha
      const cands = back.concat([[0, off], [0, -off], [w / 2 + 16, 0], [-w / 2 - 16, 0], [0, off + 32], [0, -off - 32], [w / 2 + 16, off], [-w / 2 - 16, off]]);
      let best = null;
      for (const [ox, oy] of cands) {
        const rx = clamp(P0[0] + ox - w / 2, 8, W - w - 8), ry = clamp(P0[1] + oy - h / 2, 8, H - h - 8), r = [rx, ry, rx + w, ry + h];
        if (!best) best = r; if (!taken.some(t => hit(t, r))) { best = r; break; }
      }
      taken.push(best);
      map._chip(c, p.label, best[0], best[1] + h / 2, { font });
    }
    return anim;
  };

  /* ================================================================== Continentes barajados (reto "deal", tipo "mix")
     El crupier reparte los continentes como cartas. Con k < 0.7 una pareja cambia de sitio (nivel 1; con el Nivel de crupier, siempre); con k < 0.95,
     cuatro continentes (dos parejas o un ciclo de 4); con k >= 0.95 los seis se reparten en una MESA de 3 + 3 cartas dentro de la parte libre de la vista
     de inicio (sin el HUD), cada uno escalado para caber en su carta (entre 0,55 y 1), ninguno en su plaza de siempre y todos lejos de casa.
     Juego limpio: la tierra habitada, el punto de cada pais y los objetivos de la ronda (Z.pts) que se ven en casa se siguen viendo. Sin solapes: la
     misma prueba de mascaras que la colocacion de siempre. Determinista: el presupuesto de busqueda se cuenta en barridos, no en ms (Reto diario).
     mixLayout(map, k, rr, Z) -> { shift, scale, rot, ok, deal }. Z: A.chal.hudZones (+ pts: [[lon, lat, ct]...]) */
  function mixPrep(map) {
    if (map._mixP) return map._mixP;
    const K = map.masks, CS = K.CS, NX = K.NX, X0 = K.X0, TAU = TWO_PI;
    const YPOP = 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * 72 * Math.PI / 180));   // tierra habitada: hasta 72 grados (Tromso, Murmansk, Barrow); mas al norte casi no vive nadie
    const P = [];
    for (let c = 0; c < 6; c++) {
      const L = K.cells[c], n = L.length / 2, gi = new Int32Array(n), at = new Map();
      for (let q = 0; q < n; q++) { gi[q] = Math.floor((L[2 * q + 1] - BY0) / CS) * NX + Math.floor((L[2 * q] - X0) / CS); at.set(gi[q], q); }
      /* cuerpo principal (lo que mide la carta): el trozo de tierra mas grande (celdas a menos de 2 de distancia) y los trozos a menos de 0,45 de el
         (Madagascar, Japon, Islandia, Nueva Zelanda, Galapagos). Las islas lejanas (la Polinesia que viaja con Sudamerica, Hawai con Norteamerica,
         Fiyi o Samoa con Oceania) no agrandan la carta, pero cuentan para los solapes y para el juego limpio */
      const lab = new Int32Array(n).fill(-1), comps = [];
      for (let q = 0; q < n; q++) {
        if (lab[q] >= 0) continue;
        const id = comps.length, mem = [q], st = [q]; lab[q] = id;
        while (st.length) {
          const u = st.pop(), i = gi[u] % NX, j = (gi[u] - i) / NX;
          for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const v = at.get((j + dj) * NX + i + di); if (v !== undefined && lab[v] < 0) { lab[v] = id; st.push(v); mem.push(v); } }
        }
        comps.push(mem);
      }
      comps.sort((a, b) => b.length - a.length);
      const main = comps[0].slice(), near = (m, D) => m.some(q => main.some(u => Math.hypot(L[2 * q] - L[2 * u], L[2 * q + 1] - L[2 * u + 1]) <= D));
      for (let grow = true; grow;) { grow = false; for (let i = 1; i < comps.length; i++) if (comps[i] && near(comps[i], 0.45)) { main.push(...comps[i]); comps[i] = null; grow = true; } }
      const xs = main.map(q => L[2 * q]).sort((a, b) => a - b), ys = main.map(q => L[2 * q + 1]).sort((a, b) => a - b);
      const pc = (a, f) => a[Math.min(a.length - 1, Math.max(0, Math.round((a.length - 1) * f)))];
      const box = [pc(xs, 0.01) - CS / 2, pc(ys, 0.01) - CS / 2, pc(xs, 0.99) + CS / 2, pc(ys, 0.99) + CS / 2];
      /* ancho de la carta: tambien las islas lejanas que pesan (trozos con un 4 % de la tierra o mas: Samoa, Tonga y la Polinesia al oeste de
         Sudamerica). Asi la mesa les deja sitio a la vista y lejos de los demas */
      const wide = [].concat(...comps.filter(m => m && m.length >= 0.04 * n)).concat(main), wx = wide.map(q => L[2 * q]).sort((a, b) => a - b);
      const wbox = [Math.min(box[0], pc(wx, 0.01) - CS / 2), box[1], Math.max(box[2], pc(wx, 0.99) + CS / 2), box[3]];
      /* copia a una vuelta al mundo que tambien se dibuja (como en _initGL): la de su sitio de siempre si la propia cae fuera del mundo, y la de las
         islas pequenas cerca del borde (Samoa, Tonga o la Polinesia, que viajan con Sudamerica; Fiyi con Oceania). w: +1 / -1 / 0 */
      const inMain = new Uint8Array(n); for (const q of main) inMain[q] = 1;
      const wrapOf = (x, small) => (x < -Math.PI ? 1 : x > Math.PI ? -1 : small && x < -2.34 ? 1 : small && x > 2.34 ? -1 : 0);
      const pop = [], popS = [];
      for (let q = 0; q < n; q++) {
        const x = L[2 * q], y = L[2 * q + 1]; if (Math.abs(y) >= YPOP) continue;
        const w = wrapOf(x, !inMain[q]); pop.push(x, y, w); const i = gi[q] % NX, j = (gi[q] - i) / NX; if (!(i & 1) && !(j & 1)) popS.push(x, y, w);
      }
      const pts = [];                                                  // un punto por pais (o trozo de pais que viaja con este continente)
      for (const f of map.contFeat[c]) {
        const big = f.polys.reduce((a, b) => ((b.bbox[2] - b.bbox[0]) * (b.bbox[3] - b.bbox[1]) > (a.bbox[2] - a.bbox[0]) * (a.bbox[3] - a.bbox[1]) ? b : a));
        let [x, y] = project((big.bbox[0] + big.bbox[2]) / 2, Math.max(-85, Math.min(85, (big.bbox[1] + big.bbox[3]) / 2)));
        x += TAU * Math.round((map.contCen[c][0] - x) / TAU);           // del lado del mundo de su continente (como su copia propia en la GPU)
        pts.push(x, y, wrapOf(x, big.bbox[2] - big.bbox[0] < 14 && big.bbox[3] - big.bbox[1] < 14));
      }
      P.push({ box, bw: box[2] - box[0], bh: box[3] - box[1], bc: [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2], ww: wbox[2] - wbox[0], wc: (wbox[0] + wbox[2]) / 2, pop: Float32Array.from(pop), popS: Float32Array.from(popS), pts: Float32Array.from(pts), n });
    }
    let top = -9; const A6 = K.cells[6]; for (let q = 1; q < A6.length; q += 2) top = Math.max(top, A6[q]);
    P.antTop = top + CS / 2;
    /* desarreglos de las 6 plazas de la mesa (0-2 fila de arriba, 3-5 fila de abajo); plaza de casa: NA 0, Eu 1, As 2, SA 3, Af 4, Oc 5 */
    P.HOME = [4, 0, 3, 2, 1, 5];
    const der = [], perm = (a, i) => { if (i === 6) { der.push(a.slice()); return; } for (let s = 0; s < 6; s++) if (!a.includes(s) && s !== P.HOME[i]) { a[i] = s; perm(a, i + 1); } a[i] = -1; };
    perm([-1, -1, -1, -1, -1, -1], 0); P.DER = der;                   // 265
    const off = [], st = 0.05, R = 0.8, m = Math.round(R / st);
    for (let a = -m; a <= m; a++) for (let b = -m; b <= m; b++) { const d = Math.hypot(a, b) * st; if (d <= R) off.push([a * st, b * st, d]); }
    P.OFF = off.sort((p, q) => p[2] - q[2]);
    P.occ = new Uint8Array(K.NX * K.NY);
    return (map._mixP = P);
  }

  function mixLayout(map, k, rr, Z) {
    const P = mixPrep(map), K = map.masks, CC = map.contCen, N6 = [0, 1, 2, 3, 4, 5], SMIN = 0.55, DMIN = 0.9, FR = 0.02, GAP = 0.1, TAU = TWO_PI;
    const V = Z.view, R = Z.rects, eps = 1e-6;
    const nDeal = k >= 0.95 ? 6 : k >= 0.7 ? 4 : 2;
    const ST = map._mixStats = { place: 0, scan: 0, cand: 0, fails: [], tried: 0 };
    /* presupuesto de busqueda en barridos (no en ms): el resultado depende solo de la semilla, igual en cualquier equipo (Reto diario) */
    const BUDGET = 160, SOFT = 100, TBUDGET = 90;                     // por fase: reparto parcial (tope, y tope si ya hay uno bueno) y mesa
    /* lo que se ve: rejilla fina (media celda) con la vista de inicio y el HUD; se guarda por zonas (cambia con la ventana) */
    const NX = K.NX, NY = K.NY, CS = K.CS, X0 = K.X0, HS = CS / 2, HX = NX * 2, HY = NY * 2, zkey = V.concat(...R).map(v => v.toFixed(3)).join();
    if (P.hidKey !== zkey) {
      const g = P.hidG = P.hidG || new Uint8Array(HX * HY);
      for (let j = 0; j < HY; j++) { const y = BY0 + (j + 0.5) * HS; for (let i = 0; i < HX; i++) { const x = X0 + (i + 0.5) * HS; let h = x < V[0] || x > V[2] || y < V[1] || y > V[3]; if (!h) for (const r of R) if (x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) { h = true; break; } g[j * HX + i] = h ? 1 : 0; } }
      P.hidKey = zkey; P.home = null;
    }
    const HG = P.hidG, hid = (x, y) => { const i = Math.floor((x - X0) / HS), j = Math.floor((y - BY0) / HS); return i < 0 || j < 0 || i >= HX || j >= HY || HG[j * HX + i] === 1; };
    const gone = (x, y, w) => hid(x, y) && !(w && !hid(x + w * TAU, y));   // tapado en todas sus copias
    const flags = a => { const o = new Uint8Array(a.length / 3); for (let i = 0; i < o.length; i++) o[i] = gone(a[3 * i], a[3 * i + 1], a[3 * i + 2]) ? 1 : 0; return o; };
    const home = P.home = P.home || N6.map(c => ({ pop: flags(P[c].pop), popS: flags(P[c].popS), pts: flags(P[c].pts) }));
    /* objetivos de la ronda (opcional: Z.pts = [[lon, lat, ct]...], ct el marco con el que se mueve cada uno, map._ctOf): los de un continente que se
       mueve acaban siempre a la vista, esten como esten en casa (Z es mas holgado que el HUD real: lo que Z tapa en casa suele verse de verdad).
       Como en lonLatToScreen, lo que sale por un lado del mundo entra por el otro */
    const wrapX = x => (x > Math.PI || x < -Math.PI ? x - TAU * Math.round(x / TAU) : x), TP = N6.map(() => []), MG = 0.03;   // MG: margen (~8 px) del borde de la vista y del HUD
    const hidT = (x, y) => { if (x < V[0] + MG || x > V[2] - MG || y < V[1] + MG || y > V[3] - MG) return true; for (const r of R) if (x >= r[0] - MG && x <= r[2] + MG && y >= r[1] - MG && y <= r[3] + MG) return true; return false; };
    if (Z.pts) for (const [lo, la, ct] of Z.pts) if (ct >= 0 && ct < 6) { let [x, y] = project(lo, Math.max(-89, Math.min(89, la))); x += TAU * Math.round((CC[ct][0] - x) / TAU); TP[ct].push(x, y); }
    /* juego limpio: lo que se ve en casa se sigue viendo (tierra habitada: como mucho un 2 % nueva tapada; paises y objetivos de la ronda: ninguno) */
    const fair = (c, t, full) => {
      const p = P[c], cc = CC[c], a = full ? p.pop : p.popS, h = full ? home[c].pop : home[c].popS, lim = FR * a.length / 3; let n = 0;
      for (let i = 0, u = 0; i < a.length; i += 3, u++) if (!h[u] && gone(cc[0] + t.s * (a[i] - cc[0]) + t.x, cc[1] + t.s * (a[i + 1] - cc[1]) + t.y, a[i + 2]) && ++n > lim) return false;
      const q = p.pts, hq = home[c].pts;
      for (let i = 0, u = 0; i < q.length; i += 3, u++) if (!hq[u] && gone(cc[0] + t.s * (q[i] - cc[0]) + t.x, cc[1] + t.s * (q[i + 1] - cc[1]) + t.y, q[i + 2])) return false;
      const g = TP[c];
      for (let i = 0; i < g.length; i += 2) if (hidT(wrapX(cc[0] + t.s * (g[i] - cc[0]) + t.x), cc[1] + t.s * (g[i + 1] - cc[1]) + t.y)) return false;
      return true;
    };
    /* rejilla de ocupacion de los ya colocados (engordados una celda, con sus copias a una vuelta al mundo): busqueda rapida de solapes */
    const occ = P.occ;
    let dil = 2;                                                       // mesa: dos celdas de hueco (se ve: ~1 celda, 12-19 px); repartos parciales: una (como la colocacion de siempre)
    const mark = (x, y) => { const i = Math.floor((x - X0) / CS), j = Math.floor((y - BY0) / CS), r2 = dil === 2 ? 5 : 2; for (let dj = -dil; dj <= dil; dj++) { const jj = j + dj; if (jj < 0 || jj >= NY) continue; for (let di = -dil; di <= dil; di++) { const ii = i + di; if (ii >= 0 && ii < NX && di * di + dj * dj <= r2) occ[jj * NX + ii] = 1; } } };
    const fill = (placed, T) => {
      occ.fill(0);
      for (const j of placed) { const L = K.cells[j], cc = CC[j], t = T[j]; for (let q = 0; q < L.length; q += 2) { const x = cc[0] + t.s * (L[q] - cc[0]) + t.x, y = cc[1] + t.s * (L[q + 1] - cc[1]) + t.y; mark(x, y); if (x > Math.PI - 0.7) mark(x - TAU, y); if (x < -Math.PI + 0.7) mark(x + TAU, y); } }
    };
    const hitOcc = (c, t, coarse) => {
      const L = coarse ? K.cellsS[c] : K.cells[c], cc = CC[c];
      for (let q = 0; q < L.length; q += 2) {
        const x = cc[0] + t.s * (L[q] - cc[0]) + t.x, y = cc[1] + t.s * (L[q + 1] - cc[1]) + t.y, j = Math.floor((y - BY0) / CS);
        if (j < 0 || j >= NY) continue;
        for (let w = -1; w <= 1; w++) { const i = Math.floor((x + w * TAU - X0) / CS); if (i >= 0 && i < NX && occ[j * NX + i]) return true; }
      }
      return false;
    };
    const fresh = () => [0, 1, 2, 3, 4, 5, 6].map(() => ({ x: 0, y: 0, s: 1, c: 1, n: 0 }));
    /* hueco libre mas cercano a (X,Y) (centro del cuerpo principal) con c a escala s: dentro de la vista, sin tapar nada ni pisar a nadie */
    const scan = (c, s, X, Y, maxR, T, placed) => {
      const p = P[c], cc = CC[c], t = T[c]; ST.scan++; t.s = s;
      const hw = s * p.bw / 2, hh = s * p.bh / 2, bx = X - cc[0] - s * (p.bc[0] - cc[0]), by = Y - cc[1] - s * (p.bc[1] - cc[1]);
      for (const [ox, oy, d] of P.OFF) {
        if (d > maxR) break;
        const cx = X + ox, cy = Y + oy;
        if (cx - hw < V[0] + 0.02 || cx + hw > V[2] - 0.02 || cy + hh > V[3] + 0.1 || cy - hh < P.antTop) continue;   // sin partirse por el antimeridiano y encima de la Antartida
        t.x = bx + ox; t.y = by + oy; ST.cand++;
        if (hitOcc(c, t, true) || !fair(c, t, false) || hitOcc(c, t, false) || !fair(c, t, true)) continue;
        if (map._clash(c, placed, T, 1, false)) continue;               // confirmacion exacta (la de la colocacion de siempre)
        return [t.x, t.y];
      }
      return null;
    };
    /* la mayor escala (entre sMin y s0, busqueda binaria) a la que cabe cerca de su destino */
    const place = (c, X, Y, s0, maxR, T, placed, sMin = SMIN) => {
      const t = T[c]; ST.place++; fill(placed, T);
      const top = Math.max(sMin, Math.min(1, s0)); let got = scan(c, top, X, Y, maxR, T, placed), gs = top;
      if (!got) {
        if (top <= sMin || !(got = scan(c, sMin, X, Y, maxR, T, placed))) { t.x = t.y = 0; t.s = 1; ST.fails.push(c); return false; }
        gs = sMin; let lo = sMin, hi = top;
        while (hi - lo > 0.035) { const m = (lo + hi) / 2, g = scan(c, m, X, Y, maxR, T, placed); if (g) { lo = m; got = g; gs = m; } else hi = m; }
      }
      t.s = gs; t.x = got[0]; t.y = got[1]; return true;
    };
    const massAt = (c, t) => { const cc = CC[c], m = K.mass[c]; return [cc[0] + t.s * (m[0] - cc[0]) + t.x, cc[1] + t.s * (m[1] - cc[1]) + t.y]; };
    const moved = (c, t) => { const m = massAt(c, t), h = K.mass[c]; return Math.hypot(m[0] - h[0], m[1] - h[1]); };
    const done = (T, deal) => ({ shift: T.map(t => [t.x, t.y]), scale: T.map(t => t.s), rot: [0, 0, 0, 0, 0, 0, 0], ok: true, deal });
    const fail = () => ({ shift: [0, 1, 2, 3, 4, 5, 6].map(() => [0, 0]), scale: [1, 1, 1, 1, 1, 1, 1], rot: [0, 0, 0, 0, 0, 0, 0], ok: false });

    /* parte de su tierra que cae sobre su propia huella de casa: se ha ido de verdad si es poca (Asia, enorme, puede moverse 1 unidad y seguir encima) */
    const selfOv = (c, t) => { const L = K.cellsS[c], cc = CC[c], M = K.m0[c]; let on = 0; for (let q = 0; q < L.length; q += 2) { const i = Math.floor((cc[0] + t.s * (L[q] - cc[0]) + t.x - X0) / CS), j = Math.floor((cc[1] + t.s * (L[q + 1] - cc[1]) + t.y - BY0) / CS); if (i >= 0 && i < NX && j >= 0 && j < NY && M[j * NX + i]) on++; } return on / (L.length / 2 || 1); };
    const away = (c, t, d) => moved(c, t) >= d && selfOv(c, t) <= 0.3;

    /* ---- reparto parcial: 2 (una pareja) o 4 continentes (dos parejas o un ciclo de 4) cambian de plaza; los demas, en casa ----
       Cada uno va al hueco del que ocupaba su nueva plaza (centro de su cuerpo principal). Estimacion barata del hueco: la caja del de antes menos lo
       que pisan las cajas de los que se quedan y el HUD. Se prueban en el orden de la semilla (con 4, primero los que caben holgados) */
    const hole = (b, stay) => {
      let [x0, y0, x1, y1] = P[b].box;
      for (const q of stay.map(o => P[o].box).concat(R)) {
        if (q[0] >= x1 || q[2] <= x0 || q[1] >= y1 || q[3] <= y0) continue;
        let bst = null, ba = -1;
        for (const r of [[x0, y0, Math.min(x1, q[0]), y1], [Math.max(x0, q[2]), y0, x1, y1], [x0, y0, x1, Math.min(y1, q[1])], [x0, Math.max(y0, q[3]), x1, y1]]) { const ar = Math.max(0, r[2] - r[0]) * Math.max(0, r[3] - r[1]); if (ar > ba) { ba = ar; bst = r; } }
        [x0, y0, x1, y1] = bst;
      }
      return [x0, y0, x1, y1];
    };
    const est = (a, h) => Math.min(1, 1.1 * Math.min((h[2] - h[0]) / P[a].bw, (h[3] - h[1]) / P[a].bh));
    const partial = n => {
      dil = 1; const ACC = n > 2 ? 0.58 : 0.6;                          // escala minima con la que se da por buena (con 4 hay menos sitio)
      const subs = []; (function pick(i, cur) { if (cur.length === n) { subs.push(cur.slice()); return; } for (let c = i; c < 6; c++) { cur.push(c); pick(c + 1, cur); cur.pop(); } })(0, []);
      const cands = [];
      for (const sub of subs) {
        const stay = N6.filter(c => !sub.includes(c)), H = {}; sub.forEach(b => { H[b] = hole(b, stay); });
        const ders = []; (function perm(i, cur) { if (i === sub.length) { ders.push(cur.slice()); return; } for (const b of sub) if (b !== sub[i] && !cur.includes(b)) { cur.push(b); perm(i + 1, cur); cur.pop(); } })(0, []);
        for (const dst of ders) {
          let e = 1, far = true; sub.forEach((a, i) => { const b = dst[i]; e = Math.min(e, est(a, H[b])); if (Math.hypot(P[a].bc[0] - P[b].bc[0], P[a].bc[1] - P[b].bc[1]) < DMIN) far = false; });
          if (far && e >= SMIN * 0.85) cands.push({ go: sub.map((a, i) => [a, dst[i]]), e, stay, H, key: rr() });
        }
      }
      const near = cd => cd.go.reduce((s, [a, b]) => s + Math.hypot(P[a].bc[0] - P[b].bc[0], P[a].bc[1] - P[b].bc[1]), 0);
      cands.sort(k < 0.5 ? (u, v) => near(u) - near(v) || u.key - v.key : (u, v) => u.key - v.key);   // en el orden de la semilla (mas variedad); con el Nivel de crupier (k < 0,5), la pareja mas cercana: menos desplazamiento
      let best = null, tried = 0; const s0 = ST.scan;
      for (const cd of cands) {
        if (tried >= 14 || ST.scan - s0 > BUDGET || (best && ST.scan - s0 > SOFT)) break;
        tried++; ST.tried++;
        const T = fresh(), placed = [6].concat(cd.stay), go = cd.go.slice().sort((u, v) => P[v[0]].bw * P[v[0]].bh - P[u[0]].bw * P[u[0]].bh);   // primero el mas grande
        let ok = true, mn = 1;
        for (const [a, b] of go) {
          if (!place(a, P[b].bc[0], P[b].bc[1], Math.min(1, est(a, cd.H[b]) * 1.15), 0.6, T, placed, best ? Math.min(ACC, best.mn + 0.02) : SMIN) || !away(a, T[a], DMIN * 0.8)) { ok = false; break; }
          placed.push(a); mn = Math.min(mn, T[a].s);
        }
        if (ok && (!best || mn > best.mn)) best = { T, deal: cd.go, mn };
        if (best && best.mn >= ACC) break;                              // basta con que se reconozcan bien; si no, la mejor de las probadas
      }
      return best;
    };
    if (nDeal < 6) { const b = partial(nDeal) || (nDeal > 2 ? partial(2) : null); return b ? done(b.T, b.deal) : fail(); }   // si no caben dos parejas, una

    /* ---- la mesa: 3 + 3 cartas ---- */
    let yb = P.antTop + 0.05; for (const r of R) if (r[1] <= V[1] + eps && r[0] < 0 && r[2] > 0) yb = Math.max(yb, r[3]);   // encima de la placa de abajo y de la Antartida
    const TL = R.filter(r => r[0] <= V[0] + eps && r[3] >= V[3] - eps);                       // bloque de arriba a la izquierda (marcador y barra)
    const xaTop = Math.max(V[0], ...TL.map(r => r[2]));
    const low = TL.reduce((a, r) => (!a || r[1] < a[1] ? r : a), null), boxBot = low ? low[1] : V[3], boxRight = low ? low[2] : V[0];
    const rail = R.find(r => r[2] >= V[2] - eps && r[1] > V[1] + eps && r[3] < V[3] - eps), xb = rail ? rail[0] : V[2];
    const splits = [-0.3, -0.15, 0, 0.15, 0.3].map(d => boxBot + d).filter(y => y > yb + 1.0 && y < V[3] - 1.0);
    if (!splits.length) splits.push((yb + V[3]) / 2);
    /* una fila: continentes seguidos, mismo hueco entre ellos y en los extremos; misma reduccion para todos (hasta caber de ancho), tope 1 y alto de la fila */
    const row = (list, xa, xb2, ya, yb2) => {
      const H = yb2 - ya - 0.08, Wd = xb2 - xa - GAP * (list.length + 1), smax = list.map(c => Math.min(1, H / P[c].bh));
      const need = f => list.reduce((a, c, i) => a + Math.min(smax[i], f) * P[c].ww, 0);
      let lo = 0.2, hi = 1; if (need(1) <= Wd) lo = 1; else for (let it = 0; it < 18; it++) { const m = (lo + hi) / 2; if (need(m) <= Wd) lo = m; else hi = m; }
      const s = list.map((c, i) => Math.min(smax[i], lo)), used = list.reduce((a, c, i) => a + s[i] * P[c].ww, 0), sp = (xb2 - xa - used) / (list.length + 1);
      let x = xa + sp; const X = [], Y = (ya + yb2) / 2;
      list.forEach((c, i) => { X.push(x + s[i] * (P[c].ww / 2 + P[c].bc[0] - P[c].wc)); x += s[i] * P[c].ww + sp; });   // X: centro del cuerpo principal
      return { s, X, Y };
    };
    const cands = [];
    for (const ys of splits) {
      const xaB = ys <= boxBot + 0.2 ? V[0] : boxRight;
      for (const d of P.DER) {
        const top = [], bot = []; for (let s = 0; s < 6; s++) { const c = d.indexOf(s); (s < 3 ? top : bot).push(c); }
        const A1 = row(top, xaTop, xb, ys, V[3]), B1 = row(bot, xaB, xb, yb, ys);
        const tg = [], sc = []; top.forEach((c, i) => { tg[c] = [A1.X[i], A1.Y]; sc[c] = A1.s[i]; }); bot.forEach((c, i) => { tg[c] = [B1.X[i], B1.Y]; sc[c] = B1.s[i]; });
        const mn = Math.min(...sc); if (mn < SMIN) continue;
        let far = true; for (const c of N6) { const p = P[c], m = K.mass[c], mx = tg[c][0] + sc[c] * (m[0] - p.bc[0]), my = tg[c][1] + sc[c] * (m[1] - p.bc[1]); if (Math.hypot(mx - m[0], my - m[1]) < DMIN) { far = false; break; } }
        if (!far) continue;
        const mean = sc.reduce((a, b) => a + b, 0) / 6;
        cands.push({ d, tg, sc, score: mn + 0.5 * mean, key: rr() });
      }
    }
    const best = Math.max(...cands.map(c => c.score));
    const pool = cands.filter(c => c.score >= best - 0.12).sort((u, v) => u.key - v.key);   // entre las buenas, la que diga la semilla
    for (const cd of pool.slice(0, 10)) {
      if (ST.scan > TBUDGET) break;
      const T = fresh(), placed = [6], order = N6.slice().sort((a, b) => cd.sc[b] * cd.sc[b] * P[b].bw * P[b].bh - cd.sc[a] * cd.sc[a] * P[a].bw * P[a].bh);
      let ok = true;
      for (const c of order) {
        if (!place(c, cd.tg[c][0], cd.tg[c][1], cd.sc[c], 0.45, T, placed) || !away(c, T[c], DMIN * 0.85)) { ok = false; break; }
        placed.push(c);
      }
      if (ok) return done(T, cd.d);
    }
    const b = partial(4) || partial(2); return b ? done(b.T, b.deal) : fail();   // la mesa no cabe (ventana rarisima): se reparte menos
  }

  /* ================================================================== MapViewGL */
  class MapViewGL {
    static supported() {
      try {
        const c = document.createElement("canvas"); const gl = c.getContext("webgl2"); if (!gl || !earcutFn()) return false;
        buildPrograms(gl); return true;
      } catch (e) { console.warn("WebGL2 no disponible, uso el respaldo 2D:", e.message); return false; }
    }

    constructor(canvas, world, onPick) {
      this.cv = canvas; this.world = world; this.onPick = onPick || (() => {}); this.onView = null; this.onMotion = null;
      this.gl = this._glOf(canvas);
      this.fx = document.createElement("canvas"); this.fx.id = "fx"; canvas.after(this.fx); this.fctx = this.fx.getContext("2d");
      this.view = { cx: 0, cy: 0.3, s: 100 }; this.tv = null; this.inertia = null;
      this.homeSpec = { lat: 0, lon: 0, zoom: 1 };
      this.anim = null; this.drift = null;
      this.marks = this._emptyMarks(); this.probes = []; this.pickEnabled = false; this.mouse = null;
      this.quality = "auto"; this.rs = 1; this.frameEma = 0; this.baseDt = 1e9; this.lastT = 0; this.calm = 0;
      this.rsCap = 1; this.cdpr = 1; this.idleMs = 40; this.lite = false; this.slow = 0; this.rafEma = 0; this._rawT = 0; this._win = []; this._degAt = 0; this._capInit = false; this._capQ = ""; this._lastDraw = 0;
      this.fxOn = true; this.zv = 0; this.lastLz = null; this.pv = [0, 0]; this.zc = null; this.lastView = { cx: 0, cy: 0, s: 0 };
      this.dirty = this.fxDirty = true; this.pointers = new Map(); this.samples = [];
      this.dist = { spec: null, k: 0, kk: 0, kl: 0, ko: 0, from: 0, to: 0, lfrom: 0, lto: 0, ofrom: 0, oto: 0, t0: 0, ms: 0, ct: 6 }; this.lens = null; this.hideReticle = false;
      this.sk = A.MAPSTYLES.casino || A.MAPSTYLES.expedicion; this.ms = this._prepStyle(this.sk);
      this._initGL(); this._bind(); this.resize(true);
      if (document.fonts) document.fonts.ready.then(() => { this.dirty = this.fxDirty = true; });
      /* el bucle nunca se rompe: una excepcion suelta en un fotograma (p. ej. la GPU se reinicia a medio dibujar) dejaba el mapa congelado para siempre */
      let errN = 0;
      const loop = t => { try { this._frame(t); } catch (e) { if (errN++ < 5) console.error("Mapa:", e); } requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }

    /* ---------- contexto WebGL: perdida, restauracion y rescate ---------- */
    _glOf(canvas) {
      const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "high-performance" });
      canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); if (canvas === this.cv) this.lost = true; });
      canvas.addEventListener("webglcontextrestored", () => { if (canvas === this.cv) this._regl(); });
      return gl;
    }
    /* la GPU devolvio el contexto: se reconstruye todo. Si falla (se pierde otra vez a medio camino) se queda perdido y lo rescata _frame */
    _regl() {
      try { this._initGL(); this.lost = false; this._lostSeen = 0; this.resize(true); }
      catch (e) { console.warn("Mapa: no se pudo restaurar el contexto WebGL:", e.message); this.lost = true; }
    }
    /* Windows reinicia la GPU al volver de otra aplicacion o de suspender, y si ya lo hizo varias veces Chromium deja el contexto perdido sin devolverlo
       jamas (el mapa se quedaba en blanco y la portada sin fondo). Un lienzo nuevo trae un contexto nuevo: se cambia por el viejo, en su mismo sitio */
    _revive() {
      const old = this.cv;
      try {
        const nu = old.cloneNode(false), gl = this._glOf(nu);                    // clona id, clases y estilo: el CSS y quien busque #map lo siguen encontrando
        if (!gl || gl.isContextLost()) return false;
        old.replaceWith(nu); this.cv = nu; this.gl = gl; this.pointers.clear();
        if (this._ro) this._ro.disconnect();
        this._bind(); this._initGL(); this.resize(true);
        this._lostSeen = 0; this.lost = false; this.dirty = this.fxDirty = true;
        document.dispatchEvent(new CustomEvent("aiq:mapcanvas"));                // la Enciclopedia y el puntero vuelven a engancharse al lienzo nuevo
        return true;
      } catch (e) { console.warn("Mapa: no se pudo recrear el lienzo:", e.message); this.lost = true; return false; }
    }

    /* ---------- estilo ---------- */
    _prepStyle(st) {
      return {
        raw: st, oTop: hex(st.oceanTop), oBot: hex(st.oceanBot), shallow: hex(st.shallow), grid: hex(st.grid), tropic: hex(st.tropic),
        sw: (st.swirl || ["#123a3a", "#1c6b5b", "#7a2b3f"]).map(hex),
        pal: st.land.map(hex), line: st.line, hl: hex(st.hl || "#e0492b"),
      };
    }
    setStyle(st) { this.sk = st; this.ms = this._prepStyle(st); if (this.T && this.T.swirl) this.T.swirl.ok = false; this._silKey = null; this.dirty = this.fxDirty = true; }
    setAnchor(px, py) { this.zc = [px, py]; }

    /* ---------- GL: programas, geometria y buffers ---------- */
    _initGL() {
      const gl = this.gl; this.P = buildPrograms(gl);
      // geometria: triangulos (earcut) y segmentos de frontera
      const pos = [], ci = [], ct = [], sct = [], idx = [], segs = [];
      this._initContinents();
      for (const f of this.world.features) {
        f.gl = { i0: idx.length, n: 0, s0: segs.length / 4, sn: 0 };
        for (const poly of f.polys) {
          const flat0 = [], holes = []; let off = 0;
          poly.rings.forEach((ring, ri) => {
            if (ri > 0) holes.push(off);
            for (const [lo, la] of ring) { const [x, y] = project(lo, clamp(la, -89.99, 89.99)); flat0.push(x, y); }
            off += ring.length;
          });
          const tri = earcutFn()(flat0, holes, 2);                        // una traslacion no cambia la triangulacion: vale para todas las copias
          /* copia "propia": la que queda del lado de su continente (las Aleutianas al oeste de Alaska, las Gilbert de Kiribati junto a sus otras islas,
             el este de Fiyi junto a Fiyi). Es la que se mueve con el; las demas copias la siguen a una vuelta al mundo */
          const pc = poly.ct, x0 = poly.bbox[0] * D2R, x1 = poly.bbox[2] * D2R, own = pc < 6 ? TWO_PI * Math.round((this.contCen[pc][0] - (x0 + x1) / 2) / TWO_PI) : 0;
          const copy = shift => {
            const w = pc < 6 ? Math.round((shift - own) / TWO_PI) : 0, code = pc + 8 * (w + 2);
            const base = pos.length / 2;
            for (let i = 0; i < flat0.length; i += 2) { pos.push(flat0[i] + shift, flat0[i + 1]); ci.push(f.ci); ct.push(code); }
            for (let i = 0; i < tri.length; i++) idx.push(base + tri[i]);
            let o = 0;
            for (const ring of poly.rings) { for (let i = 0; i < ring.length - 1; i++) { segs.push(flat0[(o + i) * 2] + shift, flat0[(o + i) * 2 + 1], flat0[(o + i + 1) * 2] + shift, flat0[(o + i + 1) * 2 + 1]); sct.push(code); } o += ring.length; }
          };
          const shifts = [0]; if (poly.bbox[2] > 180) shifts.push(-TWO_PI); if (poly.bbox[0] < -180) shifts.push(TWO_PI);
          if (!shifts.includes(own)) shifts.push(own);                    // la propia cae fuera del mundo en reposo (no se ve hasta que el continente se mueve)
          if (pc < 6 && x1 - x0 < 0.25 && poly.bbox[3] - poly.bbox[1] < 14) for (const s of [own - TWO_PI, own + TWO_PI]) if (!shifts.includes(s) && x1 + s > BX0 - 0.8 && x0 + s < BX1 + 0.8) shifts.push(s);   // islas cerca del borde: si su continente las empuja fuera, entran por el otro lado (Samoa, Tonga y Niue desaparecian). Solo las pequeñas: las grandes no llegan a cruzarlo (lo impide la colocacion) y duplicarlas costaria GPU
          shifts.forEach(copy);
        }
        f.gl.n = idx.length - f.gl.i0; f.gl.sn = segs.length / 4 - f.gl.s0;
      }
      this.idxCount = idx.length; this.segCount = segs.length / 4;
      if (!this.masks) this._buildMasks(pos, ct, idx);
      const buf = (target, data, usage = gl.STATIC_DRAW) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, usage); return b; };
      // VAO de rellenos
      this.vaoFill = gl.createVertexArray(); gl.bindVertexArray(this.vaoFill);
      buf(gl.ARRAY_BUFFER, new Float32Array(pos)); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      buf(gl.ARRAY_BUFFER, new Uint8Array(ci)); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 1, gl.UNSIGNED_BYTE, false, 0, 0);
      buf(gl.ARRAY_BUFFER, new Uint8Array(ct)); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.UNSIGNED_BYTE, false, 0, 0);
      buf(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(idx));
      // VAO de lineas (instanciadas)
      this.vaoLine = gl.createVertexArray(); gl.bindVertexArray(this.vaoLine);
      buf(gl.ARRAY_BUFFER, new Float32Array([0, -1, 0, 1, 1, -1, 1, 1])); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      this.segBuf = buf(gl.ARRAY_BUFFER, new Float32Array(segs)); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 16, 0); gl.vertexAttribDivisor(1, 1);
      this.sctBuf = buf(gl.ARRAY_BUFFER, new Uint8Array(sct)); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.UNSIGNED_BYTE, false, 0, 0); gl.vertexAttribDivisor(2, 1);
      this.brdBuf = buf(gl.ARRAY_BUFFER, this._borderFlags(segs)); gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.UNSIGNED_BYTE, false, 0, 0); gl.vertexAttribDivisor(3, 1);
      gl.bindVertexArray(null);
      this.vaoEmpty = gl.createVertexArray();
      this.T = {}; // objetivos de render
    }
    /* 1 = frontera entre dos paises (el segmento aparece dos veces), 0 = costa (una sola vez). Las costas no se deforman nunca. */
    _borderFlags(segs) {
      const n = segs.length / 4, cnt = new Map(), key = new Uint32Array(n), q = v => Math.round(v * 3000);
      for (let i = 0; i < n; i++) {
        let ax = q(segs[i * 4]), ay = q(segs[i * 4 + 1]), bx = q(segs[i * 4 + 2]), by = q(segs[i * 4 + 3]);
        if (ax > bx || (ax === bx && ay > by)) { [ax, bx] = [bx, ax]; [ay, by] = [by, ay]; }
        const h = (Math.imul(ax, 73856093) ^ Math.imul(ay, 19349663) ^ Math.imul(bx, 83492791) ^ Math.imul(by, 2654435761)) >>> 0;
        key[i] = h; cnt.set(h, (cnt.get(h) || 0) + 1);
      }
      const out = new Uint8Array(n); for (let i = 0; i < n; i++) out[i] = cnt.get(key[i]) > 1 ? 1 : 0; return out;
    }
    _target(name, w, h, filter) {
      const gl = this.gl; let t = this.T[name];
      if (t && t.w === w && t.h === h && t.filter === (filter || gl.LINEAR)) return t;
      if (t) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fbo); }
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter || gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter || gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return (this.T[name] = { tex, fbo, w, h, filter: filter || gl.LINEAR });
    }

    /* ---------- tamano / camara ---------- */
    _emptyMarks() { return { guess: null, answer: null, highlight: null, area: null, label: null, labelAt: null, dist: "", pop: null, t0: 0 }; }
    setMarks(m) { const hl = m.highlight && this.world.byName[m.highlight]; this.marks = { ...this._emptyMarks(), gct: m.guess ? this.pickCt : null, act: hl ? hl.ct : null, ...m, t0: performance.now() }; this.fxDirty = this.dirty = true; }
    clearMarks() { this.marks = this._emptyMarks(); this.probes = []; this.panSlack = 0; this.fxDirty = this.dirty = true; }
    /* paises tenidos por encima de la tierra ({ "Spain": [r, g, b, a] }, 0-1): la Enciclopedia pinta asi lo que llevas descubierto. null = nada */
    setPaint(p) { this.paint = p || null; this.dirty = this.fxDirty = true; }
    /* resalta un pais sin reiniciar las marcas (la chincheta no vuelve a caer): el pais bajo el raton en la Enciclopedia */
    setHighlight(name) { const f = name && this.world.byName[name]; this.marks = { ...this.marks, highlight: f ? name : null, act: f ? f.ct : null }; this.fxDirty = this.dirty = true; }
    /* sondas de la Aventura: [{lon,lat,km?,bearing?,label}] -> anillo de distancia y flecha de rumbo, siempre nitidos (vector 2D) */
    setProbes(list) { this.probes = keepT0(this.probes, list); this.fxDirty = this.dirty = true; }
    /* punto real -> coordenadas del mapa tal como se ve (deformado, sin la camara): la Brujula mide ahi el rumbo hacia el objetivo */
    sceneOf(lon, lat, ct) {
      const [x, y] = project(lon, lat); if (!this.dist.spec) return [x, y]; const [c, t] = frameOf(ct), p = this._dispFwd(x, y, c == null ? this._ctOf(lon, lat) : c);
      if (t != null) p[0] += t * TWO_PI; else if (p[0] > BX1 || p[0] < BX0) p[0] -= TWO_PI * Math.round(p[0] / TWO_PI); return p;
    }
    setPick(on) { this.pickEnabled = on; this.fxDirty = true; for (const c of [this.cv, this.fx]) c.classList.toggle("aiming", on); }
    setQuality(q) { this.quality = q; this.rs = 1; this._capInit = false; this.idleMs = 40; this.slow = 0; this.resize(true); }

    resize(force) {
      const r = this.cv.getBoundingClientRect(), raw = window.devicePixelRatio || 1;
      this.dpr = this.quality === "saver" ? Math.min(1, raw) : this.quality === "high" ? Math.min(3, raw) : Math.min(2, raw);
      const W = Math.max(1, r.width), H = Math.max(1, r.height);
      /* el lienzo GL se dibuja a una fraccion (rsCap) de la resolucion nativa segun la pantalla y el equipo; se ajusta solo si va justo */
      if (!this._capInit || this._capQ !== this.quality) {
        this._capInit = true; this._capQ = this.quality; this.rsCap = 1;
        if (this.quality === "auto") {
          const px = W * H * this.dpr * this.dpr, nv = navigator, weak = (nv.hardwareConcurrency || 8) <= 4 || (nv.deviceMemory || 8) <= 4 || /Android|iPhone|iPad|Mobile/i.test(nv.userAgent || "");
          this.rsCap = px > 8e6 ? 0.65 : px > 4.2e6 ? 0.8 : 1; if (weak) { this.rsCap = Math.min(this.rsCap, 0.8); this.idleMs = 50; }
        }
      }
      this.lite = this.quality === "saver" || this.rsCap <= 0.8; if (this.quality === "saver") this.idleMs = Math.max(this.idleMs, 66);
      this.cdpr = this.dpr * this.rsCap;
      if (force || Math.abs(W - (this.W || 0)) > 0.5 || Math.abs(H - (this.H || 0)) > 0.5 || this._lastDpr !== this.cdpr) {
        this.cv.width = Math.round(W * this.cdpr); this.cv.height = Math.round(H * this.cdpr);
        this.fx.width = Math.round(W * this.dpr); this.fx.height = Math.round(H * this.dpr);
      }
      this._lastDpr = this.cdpr; this.W = W; this.H = H;
      this.minS = Math.max(W / (BX1 - BX0), H / (BY1 - BY0));
      this.maxS = this.minS * 70;
      this.view.s = clamp(this.view.s, this.minS, this.maxS); this._clamp(this.view);
      this.dirty = this.fxDirty = true;
    }
    _clamp(v) {
      const hw = this.W / (2 * v.s), hh = this.H / (2 * v.s);
      const sl = this.panSlack || 0;                                   // v0.2.15: el encuadre del revelado puede asomar mas alla de los 180 grados (Pacifico)
      v.cx = hw * 2 >= BX1 - BX0 ? 0 : clamp(v.cx, BX0 + hw - sl, BX1 - hw + sl);
      v.cy = hh * 2 >= BY1 - BY0 ? (BY0 + BY1) / 2 : clamp(v.cy, BY0 + hh, BY1 - hh);
      return v;
    }
    setHome(spec) { this.homeSpec = { lat: spec.lat, lon: spec.lon, zoom: spec.zoom || 1 }; }
    home() {
      const h = this.homeSpec;
      if (h.zoom <= 1.001 && h.lat === 0 && h.lon === 0) return { cx: 0, cy: 0.35, s: this.minS };
      const [x, y] = project(h.lon, h.lat);
      return { cx: x, cy: y, s: this.minS * h.zoom };
    }
    animateTo(target, ms = 800) {
      const t = this._clamp({ ...target, s: clamp(target.s, this.minS, this.maxS) });
      this.drift = null; this.tv = null; this.inertia = null;
      if (ms <= 0) { this.view = t; this.anim = null; this.dirty = this.fxDirty = true; return; }
      const from = { ...this.view };
      const far = Math.min(1, Math.hypot(t.cx - from.cx, t.cy - from.cy) * Math.min(from.s, t.s) / Math.max(this.W, this.H));
      this.anim = { from, to: t, t0: performance.now(), ms, dip: 0.5 * far };
    }
    fitPoints(pts, pad = { l: 60, r: 60, t: 160, b: 120 }, ms = 900) {
      const ps = pts.map(([lo, la]) => project(lo, la));
      let x0 = Math.min(...ps.map(p => p[0])), x1 = Math.max(...ps.map(p => p[0]));
      let y0 = Math.min(...ps.map(p => p[1])), y1 = Math.max(...ps.map(p => p[1]));
      const MIN_SPAN = 0.3;
      if (x1 - x0 < MIN_SPAN) { const m = (x0 + x1) / 2; x0 = m - MIN_SPAN / 2; x1 = m + MIN_SPAN / 2; }
      if (y1 - y0 < MIN_SPAN) { const m = (y0 + y1) / 2; y0 = m - MIN_SPAN / 2; y1 = m + MIN_SPAN / 2; }
      const aw = this.W - pad.l - pad.r, ah = this.H - pad.t - pad.b;
      const s = clamp(Math.min(aw / (x1 - x0), ah / (y1 - y0)), this.minS, this.maxS);
      this.animateTo({ cx: (x0 + x1) / 2 - (pad.l - pad.r) / (2 * s), cy: (y0 + y1) / 2 + (pad.t - pad.b) / (2 * s), s }, ms);
    }
    /* encuadre del revelado (v0.2.15): tu chincheta y el objetivo, centrados y lo mas grandes posible en el mayor hueco LIBRE de la pantalla.
       Antes (fitPoints con un margen fijo) la placa, la nota de campo o el crupier tapaban la chincheta o la etiqueta del lugar.
       pts: [[lon, lat, ct], ...] tal como se ven (con los continentes movidos, sceneOf); obs: lo que tapa el HUD en px [x0, y0, x1, y1];
       mg: aire alrededor de los puntos (cabeza de la chincheta, mastil y etiqueta). Con el mapa girado (del reves, espejo) se encuadra ya girado */
    frameReveal(pts, obs = [], mg = { l: 70, r: 70, t: 90, b: 36 }, ms = 1100) {
      /* al responder, los retos del mapa se deshacen (clearDistort): se encuadra el mapa tal como QUEDARA (sin continentes movidos, escalados ni girados),
         no a mitad de la animacion; si no, con Gigantes y enanos el zoom iba a donde estaba el pais crecido/encogido y no a donde acaba */
      const W = this.W, H = this.H, clr = !!(this.dist.spec && this.dist.to === 0), o = clr ? { on: false } : this._orient();
      obs = obs.map(r => [Math.floor(r[0]), Math.floor(r[1]), Math.ceil(r[2]), Math.ceil(r[3]), r[4] || 0]);   // en pixeles enteros, como los bordes candidatos (con decimales un borde de 456,8 invalidaba el hueco que empieza en 457)
      const R = (x, y) => (o.on ? [(o.c * x) / o.sx - o.s * y, (-o.s * x) / o.sx - o.c * y] : [x, -y]);   // escena -> pantalla (sin camara)
      const Ri = (u, v) => (o.on ? [o.sx * (o.c * u - o.s * v), -(o.s * u + o.c * v)] : [u, -v]);
      const U = pts.map(p => { const q = clr ? project(p[0], p[1]) : this.sceneOf(p[0], p[1], p[2]); return R(q[0], q[1]); });
      let x0 = Math.min(...U.map(p => p[0])), x1 = Math.max(...U.map(p => p[0])), y0 = Math.min(...U.map(p => p[1])), y1 = Math.max(...U.map(p => p[1]));
      const MIN = 0.3;                                                   // con un pleno no se acerca tanto que pierdas el pais de vista
      if (x1 - x0 < MIN) { const m = (x0 + x1) / 2; x0 = m - MIN / 2; x1 = m + MIN / 2; }
      if (y1 - y0 < MIN) { const m = (y0 + y1) / 2; y0 = m - MIN / 2; y1 = m + MIN / 2; }
      const sw = x1 - x0, sh = y1 - y0, minW = mg.l + mg.r + 80, minH = mg.t + mg.b + 60;
      /* el mayor hueco: rectangulos con los bordes de la pantalla y de cada panel; gana el que deja los puntos mas grandes (y, a igualdad, el mayor) */
      const pick = (mw, mh, obs) => {
        const cut = (lim, i, j) => [...new Set([0, lim, ...obs.flatMap(r => [r[i], r[j]])].map(v => clamp(v, 0, lim)))].sort((a, b) => a - b), xs = cut(W, 0, 2), ys = cut(H, 1, 3);                                         // mw, mh: hueco minimo; sin ninguno valido (ventana muy llena), el mayor libre
        let best = null;
        for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) {
          const a = xs[i], b = xs[j]; if (b - a < mw) continue;
          for (let k = 0; k < ys.length; k++) for (let l = k + 1; l < ys.length; l++) {
            const c = ys[k], d = ys[l]; if (d - c < mh || obs.some(r => r[0] < b && r[2] > a && r[1] < d && r[3] > c)) continue;
            const s = mw ? Math.min((b - a - mg.l - mg.r) / sw, (d - c - mg.t - mg.b) / sh) : 0, area = (b - a) * (d - c);
            if (!best || (mw ? s > best.s * 1.0001 || (s >= best.s * 0.9999 && area > best.area) : area > best.area)) best = { s, area, a, b, c, d };
          }
        }
        return best;
      };
      const hard = obs.filter(r => !r[4]);                              // r[4]: obstaculo blando (el hueco del crupier, que aun no ha salido): si no queda sitio, se ignora
      let bx = pick(minW, minH, obs) || pick(minW, minH, hard);
      if (!bx) { bx = pick(0, 0, hard) || { a: 0, b: W, c: 0, d: H }; const m = Math.min(1, (bx.b - bx.a) / (mg.l + mg.r + 80), (bx.d - bx.c) / (mg.t + mg.b + 60)); mg = { l: mg.l * m, r: mg.r * m, t: mg.t * m, b: mg.b * m }; bx.s = Math.max(1, Math.min((bx.b - bx.a - mg.l - mg.r) / sw, (bx.d - bx.c - mg.t - mg.b) / sh)); }
      const s = clamp(bx.s, this.minS, this.maxS), scx = (bx.a + mg.l + bx.b - mg.r) / 2, scy = (bx.c + mg.t + bx.d - mg.b) / 2;
      const [cx, cy] = Ri((x0 + x1) / 2 - (scx - W / 2) / s, (y0 + y1) / 2 - (scy - H / 2) / s);
      this.frameBox = [bx.a, bx.c, bx.b, bx.d];      // (para las pruebas)
      /* junto al antimeridiano (Nueva Zelanda, Fiyi, Samoa...) el mapa no deja pasar de los 180 grados y el objetivo quedaba pegado al borde, bajo el
         ticket: mientras dure este revelado se deja asomar hasta 0,8 rad mas alla (alli las islas tienen su copia dibujada). clearMarks lo devuelve a 0 */
      const hw = W / (2 * s); this.panSlack = hw * 2 >= BX1 - BX0 ? 0 : clamp(Math.abs(cx) - (Math.PI - hw), 0, 0.8);
      this.animateTo({ cx, cy, s }, ms);
    }
    startDrift() {
      const v = this._clamp({ cx: 0.3, cy: 0.9, s: this.minS * 1.7 });
      this.animateTo(v, 1400); setTimeout(() => { if (!this.anim) this.drift = { base: { ...this.view }, t0: performance.now() }; }, 1500);
    }
    /* zoom suavizado hacia el cursor (objetivo + amortiguacion critica) */
    zoomBy(f, px = this.W / 2, py = this.H / 2, animate = true) {
      if (this.zzUntil && performance.now() < this.zzUntil) return;                 // Ctrl+Z: mientras el mapa vuelve atras no se toca la camara
      const base = this.tv || (this.anim ? this.anim.to : this.view);
      const [wx, wy] = this._toWorld(px, py, base);
      const s = clamp(base.s * f, this.minS, this.maxS);
      const t = this._clamp({ s, cx: wx - (px - this.W / 2) / s, cy: wy + (py - this.H / 2) / s });
      this.anim = null; this.drift = null; this.inertia = null; this.zc = [px, py];
      if (animate === false && f === 1) return;
      this.tv = t;
    }
    _toWorld(px, py, v = this.viewJ || this.view) { [px, py] = this._outToScene(px, py); return [v.cx + (px - this.W / 2) / v.s, v.cy - (py - this.H / 2) / v.s]; }
    toScreen(x, y, v = this.viewJ || this.view) { return this._sceneToOut(this.W / 2 + (x - v.cx) * v.s, this.H / 2 - (y - v.cy) * v.s); }
    /* punto real -> pantalla. Con el mapa deformado, ct es el marco (continente) con el que se mueve el punto; por defecto el del pais que lo
       contiene o el mas cercano (_ctOf solo con el mapa deformado: en el mar recorre el mundo entero). Tu chincheta y las sondas del Sonar pasan
       el marco con el que se leyo el clic: asi el anillo sale entero (antes cada punto del anillo se movia con su continente y quedaba hecho trizas).
       lon puede venir con una vuelta de mas (+-360, la linea de la chincheta a la respuesta): esa vuelta se respeta */
    lonLatToScreen(lon, lat, ct) {
      if (!this.dist.spec || !this._moved()) { const [x, y] = project(lon, lat); return this.toScreen(x, y); }
      const lo = ((lon + 180) % 360 + 360) % 360 - 180, turn = Math.round((lon - lo) / 360) * TWO_PI;   // redondeada: una longitud ya normalizada dejaba un resto de 1e-15 y el punto no daba la vuelta
      const [c, t] = frameOf(ct); let [x, y] = this._dispFwd(...project(lo, lat), c == null ? this._ctOf(lo, lat) : c);
      if (t != null) x += t * TWO_PI;                                   // marco de un clic: la copia del mundo que tocaste (junto al borde se ven las dos)
      else if (x > BX1 || x < BX0) x -= TWO_PI * Math.round(x / TWO_PI);   // lo que sale por un lado del mundo entra por el otro
      return this.toScreen(x + turn, y);
    }

    /* ---------- continentes, deformaciones y orientacion (retos) ---------- */
    _initContinents() {
      const IDX = { af: 0, na: 1, sa: 2, as: 3, eu: 4, oc: 5 };
      this.contFeat = [[], [], [], [], [], [], []]; this._allParts = null; const acc = [0, 1, 2, 3, 4, 5, 6].map(() => [0, 0, 0]);
      for (const f of this.world.features) {
        const big = f.polys.reduce((a, b) => ((b.bbox[2] - b.bbox[0]) * (b.bbox[3] - b.bbox[1]) > (a.bbox[2] - a.bbox[0]) * (a.bbox[3] - a.bbox[1]) ? b : a));
        const lo = (big.bbox[0] + big.bbox[2]) / 2, la = (big.bbox[1] + big.bbox[3]) / 2;
        const cf = A.continentMap || A.continent, k = cf ? cf(la, lo) : null; f.ct = k in IDX ? IDX[k] : 6;
        /* v0.23: los territorios a mas de 3.000 km de su pais (y lejos del antimeridiano) se mueven con el continente donde estan de verdad: la Guayana
           y las Antillas francesas, Reunion, Mayotte, el Caribe neerlandes y la Papua indonesia (con el resto de Nueva Guinea). Antes viajaban con
           Europa o con Asia y, al girar o juntar los continentes, chocaban con los demas: Europa torcida acababa en la otra punta del mapa.
           contFeat[c] lleva los paises (o sus trozos, con .ct propio) que se mueven con el continente c */
        const parts = {};
        for (const p of f.polys) {
          p.ct = f.ct;
          if (p !== big && f.ct < 6 && cf) {
            const pla = (p.bbox[1] + p.bbox[3]) / 2, plo = ((((p.bbox[0] + p.bbox[2]) / 2 + 180) % 360) + 360) % 360 - 180, pk = cf(pla, plo), pc = pk in IDX ? IDX[pk] : f.ct;
            if (pc !== f.ct && pc < 6 && Math.abs(plo) <= 150 && A.geo.distToFeature(plo, pla, { polys: [big] }, 3000) >= 3000) p.ct = pc;
          }
          (parts[p.ct] = parts[p.ct] || []).push(p);
        }
        for (const c in parts) this.contFeat[c].push(parts[c].length === f.polys.length ? f : { name: f.name, polys: parts[c], ct: +c, of: f });
        const [x, y] = project(lo, clamp(la, -85, 85)), w = (big.bbox[2] - big.bbox[0]) * (big.bbox[3] - big.bbox[1]) + 1; acc[f.ct][0] += x * w; acc[f.ct][1] += y * w; acc[f.ct][2] += w;
      }
      this.contCen = acc.map(a => (a[2] ? [a[0] / a[2], a[1] / a[2]] : [0, 0])); this.contCen.push([0, 0]);
    }
    /* continente al que pertenece el pais que contiene el punto (el mismo con el que se dibuja y se desplaza); si es mar, el pais mas cercano o la heuristica */
    _ctOf(lon, lat) {
      const key = lon.toFixed(2) + "," + lat.toFixed(2), C = this._ctCache = this._ctCache || new Map(); if (C.has(key)) return C.get(key);
      let ct = null;
      const all = this._allParts = this._allParts || this.contFeat.flat();   // paises o trozos de pais, cada uno con el continente con el que se mueve
      for (const f of all) { let near = false; for (const p of f.polys) if (lon >= p.bbox[0] - 0.5 && lon <= p.bbox[2] + 0.5 && lat >= p.bbox[1] - 0.5 && lat <= p.bbox[3] + 0.5) { near = true; break; } if (near && A.geo.inFeature(lon, lat, f)) { ct = f.ct; break; } }
      if (ct === null) { let best = 150; for (const f of all) { const d = A.geo.distToFeature(lon, lat, f, best); if (d < best) { best = d; ct = f.ct; } } }
      if (ct === null) { const IDX = { af: 0, na: 1, sa: 2, as: 3, eu: 4, oc: 5 }, cf = A.continentMap || A.continent, k = cf ? cf(lat, lon) : null; ct = k in IDX ? IDX[k] : 6; }
      if (C.size > 400) C.clear(); C.set(key, ct); return ct;
    }
    /* valores efectivos (mezcla entre "sin deformar" y el reto segun k) */
    _eff() {
      const d = this.dist, sp = d.spec, e = d.eff = d.eff || { sh: new Float32Array(16), rot: new Float32Array(8), sc: new Float32Array(8).fill(1), cen: new Float32Array(16), wob: 0, lineA: 1, oa: 0, mx: 0, on: false };
      const k = sp ? (d.kk || 0) : 0;
      for (let c = 0; c < 8; c++) { e.sh[c * 2] = sp && sp.shift[c] ? sp.shift[c][0] * k : 0; e.sh[c * 2 + 1] = sp && sp.shift[c] ? sp.shift[c][1] * k : 0; e.rot[c] = sp && sp.rot ? (sp.rot[c] || 0) * k : 0; e.sc[c] = sp && sp.scale && sp.scale[c] != null ? 1 + (sp.scale[c] - 1) * k : 1; const cc = this.contCen[c] || [0, 0]; e.cen[c * 2] = cc[0]; e.cen[c * 2 + 1] = cc[1]; }
      if (sp && sp.deal) for (let c = 0; c < 6; c++) {                  // Continentes barajados: como cartas, cada uno se encoge en su sitio y aparece en el nuevo (asi no cruzan el mapa por encima de los demas)
        const t = sp.shift[c], s1 = sp.scale[c]; if (!t || (!t[0] && !t[1] && s1 === 1)) continue;
        const on = k >= 0.5, f = on ? 2 * k - 1 : 1 - 2 * k;
        e.sh[c * 2] = on ? t[0] : 0; e.sh[c * 2 + 1] = on ? t[1] : 0; e.sc[c] = Math.max(0.001, (on ? s1 : 1) * f);
      }
      e.wob = sp ? (sp.wob || 0) * k : 0; e.lineA = sp && sp.lineA != null ? 1 + (sp.lineA - 1) * d.kl : 1; e.flat = sp && sp.flat != null ? sp.flat * d.kl : Math.max(0, 1 - e.lineA);   // tanda 6: Mapa mudo decide aparte cuanto color de pais queda
      const ko = sp ? (d.ko || 0) : 0; e.oa = sp && sp.orient ? sp.orient.rot * ko : 0; e.mx = sp && sp.orient ? (sp.orient.mx || 0) * ko : 0;
      if (sp && sp.spin) e.oa += sp.spin.amp * Math.sin((this._tNow || performance.now()) / 1000 * sp.spin.speed) * k;   // reloj del fotograma: mapa, chinchetas y clics con el mismo angulo
      e.on = !!(sp && (sp.spin || sp.orient) && (Math.abs(e.oa) > 1e-4 || e.mx > 1e-4));
      return e;
    }
    _orient() { const e = this._eff(), sx = 1 - 2 * e.mx; return { c: Math.cos(e.oa), s: Math.sin(e.oa), sx: Math.abs(sx) < 0.02 ? 0.02 : sx, on: e.on }; }
    /* pantalla CRT del casino: el post-proceso curva la imagen (q *= 1 + 0,045·|q|², con q de -1 a 1 en cada eje). Los clics y todo lo que se dibuja
       encima (chinchetas, sondas, etiquetas, la lupa de fronteras) pasan por la misma curva: antes, cerca de los bordes, el clic y la chincheta caian
       de 33 a 65 px lejos de la tierra que se veia. inv: de la imagen sin curvar a la pantalla (Newton, 4 pasos) */
    _crt(x, y, inv) {
      if (!this.sk || !this.sk.crt) return [x, y];
      const qx = (2 * x) / this.W - 1, qy = (2 * y) / this.H - 1, r2 = qx * qx + qy * qy; if (!r2) return [x, y];
      let f = 1 + 0.045 * r2;
      if (inv) { const rs = Math.sqrt(r2); let r = rs; for (let i = 0; i < 4; i++) r -= (r + 0.045 * r * r * r - rs) / (1 + 0.135 * r * r); f = r / rs; }
      return [((qx * f + 1) * this.W) / 2, ((qy * f + 1) * this.H) / 2];
    }
    /* pantalla -> escena: la curva CRT y despues el giro del mapa (del reves, espejo, ruleta), en el mismo orden que el post-proceso */
    _outToScene(x, y) { [x, y] = this._crt(x, y); return this._orientOut(x, y); }
    _sceneToOut(x, y) { const [a, b] = this._orientIn(x, y); return this._crt(a, b, true); }
    _orientOut(x, y) { const o = this._orient(); if (!o.on) return [x, y]; const cx = x - this.W / 2, cy = y - this.H / 2; const rx = (o.c * cx - o.s * cy) * o.sx, ry = o.s * cx + o.c * cy; return [rx + this.W / 2, ry + this.H / 2]; }
    _orientIn(x, y) { const o = this._orient(); if (!o.on) return [x, y]; const cx = (x - this.W / 2) / o.sx, cy = y - this.H / 2; return [o.c * cx + o.s * cy + this.W / 2, -o.s * cx + o.c * cy + this.H / 2]; }
    _dispFwd(x, y, ct) {
      const e = this._eff(); if (!this.dist.spec) return [x, y];
      const c = ct == null ? 6 : ct, cx = this.contCen[c][0], cy = this.contCen[c][1];
      if (c < 6) x += TWO_PI * Math.round((cx - x) / TWO_PI);           // del lado del mundo de su continente, como su copia propia en la GPU (islas del otro lado del antimeridiano)
      const dx = x - cx, dy = y - cy, a = e.rot[c], ca = Math.cos(a), sa = Math.sin(a), sc = e.sc[c];
      return [cx + sc * (ca * dx - sa * dy) + e.sh[c * 2], cy + sc * (sa * dx + ca * dy) + e.sh[c * 2 + 1]];
    }
    _moved(e = this._eff()) { return e.sh.some(v => Math.abs(v) > 1e-4) || e.rot.some(v => Math.abs(v) > 1e-4) || e.sc.some(v => Math.abs(v - 1) > 1e-4); }   // hay continentes movidos (no solo giro del mapa entero, temblor o fronteras falsas)
    _nearCont(c, lon, lat, km) { for (const f of this.contFeat[c] || []) if (A.geo.distToFeature(lon, lat, f, km) < km) return true; return false; }   // con tope: los paises lejanos se descartan por su caja
    _inCont(c, lon, lat) { for (const f of this.contFeat[c] || []) if (A.geo.inFeature(lon, lat, f)) return true; return false; }
    /* distancia (unidades del mapa) de un punto del mapa deformado a la tierra movida del continente c (celdas de su mascara), con el mundo dando la vuelta */
    _dispDist(c, x, y, e) {
      const L = this.masks.cells[c], cx = this.contCen[c][0], cy = this.contCen[c][1], sc = e.sc[c], a = e.rot[c], ca = Math.cos(a), sa = Math.sin(a), tx = cx + e.sh[c * 2] - x, ty = cy + e.sh[c * 2 + 1] - y;
      let best = 1e18;
      for (let q = 0; q < L.length; q += 2) { const dx = L[q] - cx, dy = L[q + 1] - cy; let X = sc * (ca * dx - sa * dy) + tx; const Y = sc * (sa * dx + ca * dy) + ty; X -= TWO_PI * Math.round(X / TWO_PI); const dd = X * X + Y * Y; if (dd < best) best = dd; }
      return Math.sqrt(best);
    }
    /* punto tocado en el mapa deformado -> coordenada real (sin normalizar). En tierra, el continente cuyo trozo movido lo contiene (primero el de la
       pregunta); en el mar, el de la pregunta si su costa real queda a menos de 260 km y si no, el continente cuya tierra movida esta mas cerca en
       el mapa que ves. Ningun clic se pierde: antes el mar se leia siempre con el continente de la pregunta y, si este se habia ido lejos, el punto
       caia fuera del mundo y el clic no hacia nada. this.lastCt: marco con el que se ha leido (null si el mapa no esta deformado) */
    _undisp(x, y) {
      const d = this.dist; this.lastCt = null; if (!d.spec) return [x, y]; const e = this._eff();
      if (!this._moved(e)) return [x, y];
      const inv = (c, xx) => { const cx = this.contCen[c][0], cy = this.contCen[c][1], sc = e.sc[c] || 1, vx = (xx - e.sh[c * 2] - cx) / sc, vy = (y - e.sh[c * 2 + 1] - cy) / sc, a = -e.rot[c], ca = Math.cos(a), sa = Math.sin(a); return [cx + ca * vx - sa * vy, cy + sa * vx + ca * vy]; };
      /* de las copias del punto (el mundo da la vuelta), la que queda a menos de media vuelta del centro de su continente: la misma regla con la que
         se dibuja (_dispFwd) y con la que se eligio la copia propia de cada poligono. Asi lo que lees es lo que ves, tambien con los continentes girados */
      const cand = c => { const cx = this.contCen[c][0], cy = this.contCen[c][1]; let best = null, bd = 1e18; for (const w of [0, -TWO_PI, TWO_PI]) { const p = inv(c, x + w), dx = Math.abs(p[0] - cx), dd = (dx > Math.PI ? 1e6 * dx : 0) + dx * dx + (p[1] - cy) ** 2; if (dd < bd) { bd = dd; best = p; } } return best; };
      const own = (c, p) => Math.abs(p[0] - this.contCen[c][0]) <= Math.PI;   // solo esa copia puede caer en su tierra dibujada (con un continente muy encogido, las otras quedan lejos)
      const q = d.ct != null && d.ct < 6 ? d.ct : null, order = [q, 0, 1, 2, 3, 4, 5].filter((c, i, a) => c != null && a.indexOf(c) === i);
      for (const c of order) { const p = cand(c); if (!own(c, p)) continue; const [lo, la] = unproject(p[0], p[1]); if (this._inCont(c, lo, la)) { this.lastCt = c; return p; } }
      if (q != null) { const p = cand(q); if (own(q, p)) { const [lo, la] = unproject(p[0], p[1]); if (Math.abs(la) <= 89 && this._nearCont(q, lo, la, 260)) { this.lastCt = q; return p; } } }   // pasado el polo, la cuenta de distancias da la vuelta y "encontraba" costa
      /* mar abierto: el continente mas cercano en el mapa que ves; el de la pregunta cuenta como si estuviera algo mas cerca (un mar lejos de la costa se
         lee con el marco en el que se dibuja) y nunca un marco que lleve el toque mas alla del polo (la chincheta saldria lejos del dedo) */
      let bc = q != null ? q : 0, bd = 1e18;
      for (let c = 0; c < 6; c++) { const p = cand(c), dd = this._dispDist(c, x, y, e) * (c === q ? 0.6 : 1) + (own(c, p) ? 0 : 1e3) + (Math.abs(unproject(p[0], p[1])[1]) > 89 ? 500 : 0); if (dd < bd) { bd = dd; bc = c; } }
      this.lastCt = bc; return cand(bc);
    }
    /* coordenadas del mapa (ya sin deformar) -> lon/lat. Deformado, la lectura puede dar la vuelta al mundo o pasarse del polo: se normaliza
       (antes se tiraba el clic); sin deformar, fuera del mundo sigue sin haber nada */
    _real(x, y) { const [lon, lat] = unproject(x, y); return this.lastCt == null ? [lon, lat] : [((lon + 180) % 360 + 360) % 360 - 180, clamp(lat, -89.5, 89.5)]; }
    /* Mascaras de tierra por continente (rejilla gruesa en coordenadas del mapa): sirven para comprobar SOLAPES REALES entre continentes, no cajas. */
    /* Solo cuenta la copia propia de cada poligono (la que se mueve con su continente) y la rejilla sobra por los lados: Rusia llega a 190° y las
       islas del otro lado del antimeridiano se colocan junto a su continente. Asi las mascaras son lo que de verdad se dibuja al moverlo */
    _buildMasks(pos, ctv, idx) {
      const CS = 0.06, X0 = BX0 - 0.6, NX = Math.ceil((BX1 + 0.6 - X0) / CS), NY = Math.ceil((BY1 - BY0) / CS), m0 = [0, 1, 2, 3, 4, 5, 6].map(() => new Uint8Array(NX * NY));
      const cell = (x, y) => [Math.floor((x - X0) / CS), Math.floor((y - BY0) / CS)];
      const cov = new Uint8Array(NX * NY), miss = [];
      for (let t = 0; t < idx.length; t += 3) {
        const ia = idx[t], ib = idx[t + 1], ic = idx[t + 2], code = ctv[ia], c = code & 7, M = m0[c];
        if (code >> 3 !== 2) continue;                                   // copias a una vuelta al mundo: se mueven con la propia, no se cuentan aparte
        const ax = pos[ia * 2], ay = pos[ia * 2 + 1], bx = pos[ib * 2], by = pos[ib * 2 + 1], cx = pos[ic * 2], cy = pos[ic * 2 + 1];
        const x0 = Math.min(ax, bx, cx), x1 = Math.max(ax, bx, cx), y0 = Math.min(ay, by, cy), y1 = Math.max(ay, by, cy);
        if (x1 < X0 || x0 > X0 + NX * CS || y1 < BY0 || y0 > BY1) continue;
        const i0 = Math.max(0, Math.floor((x0 - X0) / CS)), i1 = Math.min(NX - 1, Math.floor((x1 - X0) / CS)), j0 = Math.max(0, Math.floor((y0 - BY0) / CS)), j1 = Math.min(NY - 1, Math.floor((y1 - BY0) / CS));
        const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); let hit = false;
        if (Math.abs(den) > 1e-12) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const px = X0 + (i + 0.5) * CS, py = BY0 + (j + 0.5) * CS, w1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / den, w2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / den;
          if (w1 >= 0 && w2 >= 0 && w1 + w2 <= 1) { M[j * NX + i] = 1; cov[j * NX + i] = 1; hit = true; }
        }
        if (!hit) miss.push(c, (ax + bx + cx) / 3, (ay + by + cy) / 3);
      }
      for (let q = 0; q < miss.length; q += 3) { const [ci, cj] = cell(miss[q + 1], miss[q + 2]); if (ci >= 0 && ci < NX && cj >= 0 && cj < NY && !cov[cj * NX + ci]) m0[miss[q]][cj * NX + ci] = 1; }   // islas menores que una celda (solo si esa celda esta libre: las astillas de frontera no cuentan)
      const m1 = m0.map(M => { const D = new Uint8Array(NX * NY); for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) if (M[j * NX + i]) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && ii < NX && jj >= 0 && jj < NY) D[jj * NX + ii] = 1; } return D; });
      const cells = m0.map(M => { const L = []; for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) if (M[j * NX + i]) L.push(X0 + (i + 0.5) * CS, BY0 + (j + 0.5) * CS); return Float32Array.from(L); });
      const mass = cells.map(L => { let sx = 0, sy = 0; const n = L.length / 2 || 1; for (let i = 0; i < L.length; i += 2) { sx += L[i]; sy += L[i + 1]; } return [sx / n, sy / n]; });
      const sd = cells.map((L, i) => { let vx = 0, vy = 0; const n = L.length / 2 || 1; for (let q = 0; q < L.length; q += 2) { vx += (L[q] - mass[i][0]) ** 2; vy += (L[q + 1] - mass[i][1]) ** 2; } return [Math.sqrt(vx / n), Math.sqrt(vy / n)]; });   // extension tipica (ignora las islas lejanas del antimeridiano)
      const ext = cells.map((L, i) => { const xs = [], ys = []; for (let q = 0; q < L.length; q += 2) { xs.push(L[q] - mass[i][0]); ys.push(L[q + 1] - mass[i][1]); } xs.sort((u, v) => u - v); ys.sort((u, v) => u - v); const n = xs.length || 1, at = (arr, f) => arr[Math.min(n - 1, Math.max(0, Math.floor(n * f)))] || 0; return [at(xs, 0.05), at(xs, 0.95), at(ys, 0.005), at(ys, 0.995)]; });   // extension robusta (ignora islas lejanas)
      const cellsS = cells.map(L => { const o = []; for (let q = 0; q < L.length; q += 2) { const ix = Math.round((L[q] - X0) / CS - 0.5), iy = Math.round((L[q + 1] - BY0) / CS - 0.5); if (!(ix & 1) && !(iy & 1)) o.push(L[q], L[q + 1]); } return Float32Array.from(o); });   // 1 de cada 4 celdas: busqueda rapida
      this.masks = { CS, X0, NX, NY, m0, m1, cells, cellsS, mass, sd, ext };
    }
    /* ¿Algun trozo del continente i (con su transformacion) cae dentro del continente j (con la suya)? gap=1: j se engorda una celda (deja hueco). */
    _hits(i, j, T, gap, coarse) {
      const K = this.masks, Li = coarse ? K.cellsS[i] : K.cells[i], Mj = gap ? K.m1[j] : K.m0[j], CS = K.CS, X0 = K.X0, NX = K.NX, NY = K.NY, ci = this.contCen[i], cj = this.contCen[j], ti = T[i], tj = T[j];
      const inJ = (wx, wy) => { const vx = (wx - tj.x - cj[0]) / tj.s, vy = (wy - tj.y - cj[1]) / tj.s, ux = cj[0] + tj.c * vx + tj.n * vy, uy = cj[1] - tj.n * vx + tj.c * vy, ix = Math.floor((ux - X0) / CS), iy = Math.floor((uy - BY0) / CS); return ix >= 0 && ix < NX && iy >= 0 && iy < NY && Mj[iy * NX + ix] === 1; };
      for (let q = 0; q < Li.length; q += 2) {
        const dx = Li[q] - ci[0], dy = Li[q + 1] - ci[1];
        const wx = ci[0] + ti.s * (ti.c * dx - ti.n * dy) + ti.x, wy = ci[1] + ti.s * (ti.n * dx + ti.c * dy) + ti.y;
        if (inJ(wx, wy)) return true;
        if ((wx > BX1 - 0.7 && inJ(wx - TWO_PI, wy)) || (wx < BX0 + 0.7 && inJ(wx + TWO_PI, wy))) return true;   // el mundo da la vuelta: lo que sale por un lado entra por el otro
      }
      return false;
    }
    /* margen extra (Pangea, que los aprieta): libre tambien movido una celda en las ocho direcciones. Con una sola celda de margen se
       colaba una astilla de Asia en Europa por Turquia y el Caucaso (13 px en layoutTest) */
    _roomy(c, placed, T, gap) {
      const t = T[c], x = t.x, y = t.y; let ok = true;
      for (const [dx, dy] of [[0.06, 0], [-0.06, 0], [0, 0.06], [0, -0.06], [0.04, 0.04], [-0.04, 0.04], [0.04, -0.04], [-0.04, -0.04]]) { t.x = x + dx; t.y = y + dy; if (this._clash(c, placed, T, gap, false)) { ok = false; break; } }
      t.x = x; t.y = y; return ok;
    }
    _clash(i, placed, T, gap, coarse) { for (const j of placed) if (this._hits(i, j, T, gap, coarse) || this._hits(j, i, T, gap, coarse)) return true; return false; }
    /* Coloca los continentes segun un tipo (pangea | spread | hold) SIN que se pisen NUNCA.
       Se van colocando de uno en uno; cada continente va lo mas cerca posible de su destino y, si ahi hay otro (comprobado con las mascaras de tierra reales), se busca el hueco libre mas cercano.
       En Pangea se encogen un poco para encajar. Si algo no cabe, todo se encoge hasta que quepa. k: fuerza 0..1; rot: giro final de cada continente (tilt).
       Devuelve { shift: [[dx,dy] x7], scale: [x7], ok } en unidades del mapa. */
    warmMix() { mixPrep(this); }                                       // la preparacion de Continentes barajados, en un hueco libre aparte (una vez)
    layout(kind, k, rr, rot, zones, scl) {
      if (kind === "mix") return mixLayout(this, k, rr, zones || { view: [BX0, BY0, BX1, BY1], rects: [] });   // Continentes barajados
      const base = { pangea: 1 - 0.26 * k, spread: 1 - 0.16 * k, hold: 0.9 }[kind] || 1;   // los continentes no caben a tamano real sin pisarse: se encogen segun el reto
      return this._layout(kind, k, rot, base, zones, scl);
    }
    /* tierra del continente c, colocado con t, que queda fuera de la vista de inicio o debajo del HUD (celdas gruesas). Z: { view:[x0,y0,x1,y1],
       rects:[[x0,y0,x1,y1]...] } en unidades del mapa. Sin rest devuelve que celdas quedan tapadas; con rest (las tapadas en su sitio), la parte (0..1)
       que se tapa de nuevo: no vale cambiar Alaska, tapada de siempre, por la costa de Seattle */
    _hidden(c, t, Z, rest) {
      const L = this.masks.cellsS[c], cc = this.contCen[c], V = Z.view, out = rest ? null : new Uint8Array(L.length / 2); let n = 0;
      for (let q = 0, i = 0; q < L.length; q += 2, i++) {
        const dx = L[q] - cc[0], dy = L[q + 1] - cc[1], x = cc[0] + t.s * (t.c * dx - t.n * dy) + t.x, y = cc[1] + t.s * (t.n * dx + t.c * dy) + t.y;
        let h = x < V[0] || x > V[2] || y < V[1] || y > V[3];
        if (!h) for (const r of Z.rects) if (x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) { h = true; break; }
        if (out) out[i] = h ? 1 : 0; else if (h && !rest[i]) n++;
      }
      return out || (L.length ? n / (L.length / 2) : 0);
    }
    _layout(kind, k, rot, base, Z, scl) {
      const K = this.masks, home = K.mass, anchor = [0.05, 0.3], tg = [], R = rot || [0, 0, 0, 0, 0, 0, 0];
      for (let c = 0; c < 6; c++) {
        const h = home[c];
        if (kind === "pangea") tg[c] = [h[0] + (anchor[0] - h[0]) * k * 0.95, h[1] + (anchor[1] - h[1]) * k * 0.95];   // cada uno se acerca desde su lado: al llegar todos al mismo punto (nivel 3) se colocaban en cualquier lado y el mapa quedaba barajado
        else if (kind === "spread") tg[c] = [h[0] + (h[0] - anchor[0]) * k * 0.45, h[1] + (h[1] - anchor[1]) * k * 0.45];
        else tg[c] = h.slice();
      }
      if (!this._offs) { const o = [], st = 0.06, RMAX = 3.0, n = Math.round(RMAX / st); for (let a = -n; a <= n; a++) for (let b = -n; b <= n; b++) { const d = Math.hypot(a, b) * st; if (d <= RMAX) o.push([a * st, b * st, d]); } o.sort((p, q) => p[2] - q[2]); this._offs = o; }
      const sq = c => (scl ? scl[c] * scl[c] : 1), order = [0, 1, 2, 3, 4, 5].sort((a, b) => kind === "pangea" ? Math.hypot(tg[a][0] - anchor[0], tg[a][1] - anchor[1]) - Math.hypot(tg[b][0] - anchor[0], tg[b][1] - anchor[1]) : K.cells[b].length * sq(b) - K.cells[a].length * sq(a));   // Gigantes y enanos: primero los que mas ocupan ya crecidos
      const gap = 1, order2 = order.slice().reverse(), SM = scl ? this._southMinY() : null, ANT = scl ? project(0, -62)[1] : 0;   // Gigantes y enanos: ningun trozo (islas lejanas incluidas) baja de los 62 S, donde empieza la Antartida
      /* juego limpio: la tierra que se ve con el continente en su sitio sigue viendose al moverlo (como mucho un 4 % se tapa por el HUD o sale de la
         vista). Antes podia acabar un continente entero debajo del marcador (Oceania con la pregunta de Papua Nueva Guinea) */
      const hid0 = Z ? [0, 1, 2, 3, 4, 5].map(c => this._hidden(c, { x: 0, y: 0, s: 1, c: 1, n: 0 }, Z)) : null;
      const attempt = (S0, ord) => {
        const T = [0, 1, 2, 3, 4, 5, 6].map(c => ({ x: 0, y: 0, s: c === 6 ? 1 : S0, c: Math.cos(R[c] || 0), n: Math.sin(R[c] || 0) })), placed = [6];
        for (const c of ord) {
          const sc0 = scl ? scl[c] : 1, cc0 = this.contCen[c], E = K.ext[c], big = R[c] ? Math.max(Math.abs(E[0]), E[1], Math.abs(E[2]), E[3]) * 0.75 : 0, ex0 = big ? -big : E[0], ex1 = big || E[1], ey0 = big ? -big : E[2], ey1 = big || E[3], t = T[c];
          const hx0 = home[c][0] - anchor[0], hy0 = home[c][1] - anchor[1], hl = Math.hypot(hx0, hy0) || 1;
          const place = (sc, maxD, sided, to = tg[c]) => {               // hueco libre mas cercano a su destino (a menos de maxD), con el continente a escala sc
            t.s = sc; const mg = scl ? 0 : 0.4, lx = BX0 - mg - ex0 * sc, hx = BX1 + mg - ex1 * sc, ly = BY0 + 0.18 - ey0 * sc, hy = BY1 - 0.05 - ey1 * sc;   // el continente (sin islas sueltas) queda dentro del mundo y lejos de la Antartida
            for (const [ox, oy, d] of this._offs) {
              if (d > maxD) return false;
              if (scl) { t.x = to[0] - cc0[0] - sc * (home[c][0] - cc0[0]) + ox; t.y = to[1] - cc0[1] - sc * (home[c][1] - cc0[1]) + oy; } else { t.x = to[0] - home[c][0] + ox; t.y = to[1] - home[c][1] + oy; }   // Gigantes y enanos: crece o se encoge alrededor de su centro de masa
              const m = this._massAt(c, T, K.mass); if (m[0] < lx || m[0] > hx || m[1] < ly || m[1] > hy) continue;
              if (sided) { const mx = m[0] - anchor[0], my = m[1] - anchor[1]; if (mx * hx0 + my * hy0 < 0.7 * hl * Math.hypot(mx, my)) continue; }   // Pangea: se arrima por su lado (a menos de 45 grados), no por el otro
              if (SM && cc0[1] + sc * (SM[c] - cc0[1]) + t.y < ANT) continue;
              if (hid0 && this._hidden(c, t, Z, hid0[c]) > (scl ? (this.giantTol || 0.12) : 0.04)) continue;   // Gigantes y enanos: el gigante se pasa del marco (hay que mover el mapa)
              if (!this._clash(c, placed, T, gap, true) && !this._clash(c, placed, T, gap, false) && ((kind !== "pangea" && !scl) || this._roomy(c, placed, T, gap))) return true;
            }
            return false;
          };
          /* Big bang y Continentes torcidos: cada continente se queda junto a su sitio aunque tenga que encogerse un poco (antes Europa, girada, no
             cabia entre Asia y Africa y acababa en la otra punta del mapa); solo si ni asi cabe, al hueco libre mas cercano.
             Pangea: si no queda hueco por su lado cerca del destino, el continente se queda mas atras, en su camino desde casa, antes que cruzar el mapa
             (en el nivel 2 Oceania acababa siempre encima de Asia: un Continentes barajados disfrazado); si tampoco, se encoge un poco */
          const path = f => [home[c][0] + (tg[c][0] - home[c][0]) * f, home[c][1] + (tg[c][1] - home[c][1]) * f];
          const back = () => [1, 0.8, 0.6, 0.4, 0.2, 0].some(f => place(S0, 0.35, true, path(f))) || place(S0, 1.3, true) ||
            [0.88, 0.77, 0.66].some(sc => [0.5, 0].some(f => place(S0 * sc, 0.6, true, path(f))));   // si ni asi, encogido antes que al otro lado del mapa (con fuerza 0,5 o 0,8 Asia bajaba al Indico y Oceania acababa junto a las Americas)
          const found = kind === "pangea" ? back() || place(S0, Infinity, true) || place(S0, Infinity) : (sc0 > 1.05 ? [[1, 0.55], [1, 0.9], [0.94, 0.9], [0.88, 0.9], [0.82, 0.9]] : [[1, 0.55], [0.88, 0.55], [0.77, 0.55], [1, 0.9], [0.88, 0.9], [0.77, 0.9], [0.66, 0.9]]).some(([f, d]) => place(S0 * sc0 * f, d)) || place(S0 * sc0, Infinity);
          if (!found) { this._layFail = c; return null; }
          placed.push(c);
        }
        return T;
      };
      let S0 = base, T = attempt(S0, order) || attempt(S0, order2);
      for (let tries = 0; !T && tries < 12; tries++) { S0 *= 0.95; T = attempt(S0, order) || attempt(S0, order2); }
      if (!T) return { shift: [0, 1, 2, 3, 4, 5, 6].map(() => [0, 0]), scale: [1, 1, 1, 1, 1, 1, 1], ok: false };
      return { shift: T.map(t => [t.x, t.y]), scale: T.map(t => t.s), ok: true };
    }
    _southMinY() { if (this._smy) return this._smy; const r = [1e9, 1e9, 1e9, 1e9, 1e9, 1e9]; for (const f of this.world.features) for (const p of f.polys) { const c = p.ct; if (c == null || c > 5) continue; for (const ring of p.rings) for (const q of ring) { const y = project(q[0], Math.max(-89.99, q[1]))[1]; if (y < r[c]) r[c] = y; } } return (this._smy = r); }   // el punto mas al sur de cada continente, con sus islas
    _massAt(c, T, mass) { const t = T[c], cc = this.contCen[c], dx = mass[c][0] - cc[0], dy = mass[c][1] - cc[1]; return [cc[0] + t.s * (t.c * dx - t.n * dy) + t.x, cc[1] + t.s * (t.n * dx + t.c * dy) + t.y]; }
    /* spec: {shift:[[dx,dy]x7], rot:[x7], wob, lineA, orient:{rot,mx}, spin:{amp,speed}, mosaic, quake, pan:{vx,vy}, ct}. Se anima de "normal" a la deformacion. */
    setDistort(spec, ms = 900) {
      const d = this.dist, now = performance.now();
      d.spec = spec; d.ct = spec && spec.ct != null ? spec.ct : 6; d.t0 = now; d.ms = ms;
      d.from = d.k; d.to = 1; d.lfrom = d.kl; d.lto = 1; d.ofrom = d.ko; d.oto = spec && spec.orient ? 1 : 0; this.dirty = this.fxDirty = true;
    }
    /* cambia solo la orientacion (Astrolabio) sin tocar el resto */
    setOrient(on, ms = 900) { const d = this.dist; if (!d.spec) return; d.t0 = performance.now(); d.ms = ms; d.from = d.k; d.to = d.k; d.lfrom = d.kl; d.lto = d.kl; d.ofrom = d.ko; d.oto = on ? 1 : 0; this.dirty = this.fxDirty = true; }
    clearDistort(ms = 800) {
      const d = this.dist; if (!d.spec) return;
      d.t0 = performance.now(); d.ms = ms; d.from = d.k; d.to = 0; d.lfrom = d.kl; d.lto = 0; d.ofrom = d.ko; d.oto = 0; this.dirty = this.fxDirty = true;
    }
    _stepDistort(now) {
      const d = this.dist; if (!d.spec && !d.k && !d.ko) return;
      if (d.k !== d.to || d.kl !== d.lto || d.ko !== d.oto) {
        const t = d.ms <= 0 ? 1 : Math.min(1, (now - d.t0) / d.ms), back = x => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
        d.k = d.from + (d.to - d.from) * (d.to > d.from && !(d.spec && d.spec.smooth) ? back(t) : easeIO(t)); d.kk = d.k;
        d.kl = d.lfrom + (d.lto - d.lfrom) * easeIO(t); d.ko = d.ofrom + (d.oto - d.ofrom) * easeIO(t);
        if (t >= 1) { d.k = d.kk = d.to; d.kl = d.lto; d.ko = d.oto; if (d.to === 0 && d.oto === 0) { d.spec = null; d.ko = 0; } }
        this.dirty = this.fxDirty = true;
      } else d.kk = d.k;
    }
    /* punto de pantalla (px CSS del lienzo) -> lon/lat reales, teniendo en cuenta orientacion y continentes movidos */
    screenToLonLat(px, py) { let [x, y] = this._toWorld(px, py); [x, y] = this._undisp(x, y); return this._real(x, y); }
    /* lupa de fronteras verdaderas (Sello de aduana / Teodolito): {x,y,r} en px CSS o null */
    setLens(l) {                                                        // la lupa solo obliga a repintar si hay deformacion del mapa y cambia de sitio
      const o = this.lens; if (!o && !l) return;
      if (o && l && o.x === l.x && o.y === l.y && o.r === l.r) return;
      this.lens = l; if (this.dist.spec) this.dirty = true;
    }
    setDecoys(list) { this.decoys = list || []; this.fxDirty = true; }
    /* terremoto (la camara efectiva tiembla; los clics usan esa misma vista) y deriva (el mapa se desliza solo) */
    _stepMotion(now, dt) {
      const sp = this.dist.spec, k = sp ? Math.min(1, this.dist.kk || 0) : 0;
      if (sp && sp.pan && k > 0.05 && !this.pointers.size) {
        const P = sp.pan, t = now / 1000; this.view.cx += P.vx * Math.cos(t * 0.35) * dt / this.view.s * k; this.view.cy += P.vy * Math.sin(t * 0.27 + 1) * dt / this.view.s * k; this._clamp(this.view); this.dirty = this.fxDirty = true;
      }
      if (sp && sp.quake && k > 0.05) {
        if (now - (this._qT || 0) > 55) { this._qT = now; const a = sp.quake * k / this.view.s; this._qj = [(Math.random() - 0.5) * 2 * a, (Math.random() - 0.5) * 2 * a]; }
        const j = this._qj || [0, 0]; this.viewJ = { cx: this.view.cx + j[0], cy: this.view.cy + j[1], s: this.view.s }; this.dirty = this.fxDirty = true;
      } else if (this.viewJ) this.viewJ = null;
      if (this._qk) {                                                    // tanda 8: la sacudida (quakeKick) mueve el mapa de sitio y tiembla fuerte un momento
        const q = this._qk, u = (now - q.t0) / q.ms;
        if (u >= 1 || !sp) this._qk = null;
        else {
          const e = 1 - Math.pow(1 - Math.min(1, u * 4), 3), de = e - q.done; q.done = e;
          if (!this.pointers.size) { this.view.cx += (q.jx * de) / this.view.s; this.view.cy += (q.jy * de) / this.view.s; this._clamp(this.view); }
          const a = (q.amp * (1 - u) * (1 - u)) / this.view.s, b = this.viewJ || this.view;
          this.viewJ = { cx: b.cx + (Math.random() - 0.5) * 2 * a, cy: b.cy + (Math.random() - 0.5) * 2 * a, s: this.view.s }; this.dirty = this.fxDirty = true;
        }
      }
    }
    quakeKick(amp, jolt) { const a = Math.random() * Math.PI * 2; this._qk = { t0: performance.now(), ms: 750, amp, jx: Math.cos(a) * jolt, jy: Math.sin(a) * jolt, done: 0 }; this.dirty = this.fxDirty = true; }
    distorted() { return !!(this.dist.spec && this.dist.k > 0.01); }
    /* uniformes de deformacion para un programa */
    _setDist(p) {
      const gl = this.gl, e = this._eff();
      if (p.u.u_dsh !== undefined) gl.uniform2fv(p.u.u_dsh, e.sh);
      if (p.u.u_drot !== undefined) gl.uniform1fv(p.u.u_drot, e.rot);
      if (p.u.u_dcen !== undefined) gl.uniform2fv(p.u.u_dcen, e.cen);
      if (p.u.u_dsc !== undefined) gl.uniform1fv(p.u.u_dsc, e.sc);
      if (p.u.u_ori !== undefined) { const o = this._orient(); gl.uniform4f(p.u.u_ori, o.c, o.s, o.sx, o.on ? 1 : 0); }
    }
    zoomLevel() { return this.view.s / this.minS; }

    /* ---------- interaccion ---------- */
    _bind() {
      const cv = this.cv; cv.style.touchAction = "none";
      cv.addEventListener("contextmenu", e => e.preventDefault());
      cv.addEventListener("pointerdown", e => {
        if (this.zzUntil && performance.now() < this.zzUntil) return;               // Ctrl+Z: durante el rebobinado no se aceptan clics
        if (e.pointerType === "mouse" && e.button !== 0) return;                   // solo el boton principal: el derecho o la rueda ya no marcan respuesta al soltar
        cv.setPointerCapture(e.pointerId); this.drift = null; this.inertia = null; this.tv = null; this.samples = [];
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false });
        if (this.pointers.size === 2) this._pinch = this._pinchState();
      });
      cv.addEventListener("pointermove", e => {
        if (e.pointerType === "mouse") { const r = cv.getBoundingClientRect(); this.mouse = { x: e.clientX - r.left, y: e.clientY - r.top }; this.fxDirty = true; }
        const p = this.pointers.get(e.pointerId); if (!p) return; if (e.pointerType === "mouse" && !(e.buttons & 1)) { up({ pointerId: e.pointerId, type: "pointercancel" }); return; }   // el boton ya no esta pulsado: el arrastre acabo fuera
        let dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
        if (this._orient().on) { const [a0, b0] = this._orientOut(0, 0), [a1, b1] = this._orientOut(dx, dy); dx = a1 - a0; dy = b1 - b0; }   // arrastrar: solo el giro (la curva CRT no cambia el sentido)
        if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > (e.pointerType === "touch" ? 10 : 5)) p.moved = true;
        if (this.pointers.size === 1 && p.moved) {
          this.anim = null; this.view.cx -= (dx * A.mapSens.pan) / this.view.s; this.view.cy += (dy * A.mapSens.pan) / this.view.s; this._clamp(this.view);
          this.dirty = this.fxDirty = true; cv.classList.add("grabbing"); this.fx.classList.add("grabbing");
          const now = performance.now(); this.samples.push([now, dx, dy]); while (this.samples.length && now - this.samples[0][0] > 90) this.samples.shift();
        } else if (this.pointers.size === 2) {
          const st = this._pinchState();
          if (this._pinch && this._pinch.d > 0) {
            this.anim = null; const r = cv.getBoundingClientRect(), px = st.mx - r.left, py = st.my - r.top;
            const [wx, wy] = this._toWorld(px, py); const s = clamp(this.view.s * (st.d / this._pinch.d), this.minS, this.maxS);
            this.view = this._clamp({ s, cx: wx - (px - this.W / 2) / s, cy: wy + (py - this.H / 2) / s }); this.zc = [px, py]; this.dirty = this.fxDirty = true;
          }
          this._pinch = st;
        }
      });
      cv.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") { this.mouse = null; this.fxDirty = true; } });
      const up = e => {
        const p = this.pointers.get(e.pointerId); if (!p) return;
        this.pointers.delete(e.pointerId); cv.classList.remove("grabbing"); this.fx.classList.remove("grabbing");
        if (!p.moved && this.pointers.size === 0 && !this._wasPinch && e.type === "pointerup") { const r = cv.getBoundingClientRect(); this._tap(e.clientX - r.left, e.clientY - r.top); }
        // inercia al soltar
        if (p.moved && this.pointers.size === 0 && !this._wasPinch && this.samples.length > 1) {
          const t0 = this.samples[0][0], t1 = this.samples[this.samples.length - 1][0], dt = Math.max(16, t1 - t0) / 1000;
          const sx = this.samples.reduce((a, s) => a + s[1], 0) / dt, sy = this.samples.reduce((a, s) => a + s[2], 0) / dt;
          if (performance.now() - t1 < 60 && Math.hypot(sx, sy) > 250) this.inertia = { vx: (-sx * A.mapSens.pan) / this.view.s, vy: (sy * A.mapSens.pan) / this.view.s };
        }
        this._wasPinch = this.pointers.size > 0; if (this.pointers.size === 0) this._wasPinch = false;
      };
      cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up); cv.addEventListener("lostpointercapture", up);
      cv.addEventListener("wheel", e => {
        e.preventDefault(); const r = cv.getBoundingClientRect();
        this.zoomBy(Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0018) * A.mapSens.zoom), e.clientX - r.left, e.clientY - r.top);
      }, { passive: false });
      this._ro = new ResizeObserver(() => this.resize()); this._ro.observe(cv);
    }
    /* mando (js/mando.js): mover la camara dx, dy px de pantalla (stick derecho, borde de la pantalla) y clavar donde esta la mira */
    nudge(dx, dy) {
      if (this.zzUntil && performance.now() < this.zzUntil) return;
      if (this._orient().on) { const [a0, b0] = this._orientOut(0, 0), [a1, b1] = this._orientOut(dx, dy); dx = a1 - a0; dy = b1 - b0; }
      this.anim = null; this.drift = null; this.inertia = null; this.padPanAt = performance.now();   // la Siesta (js/jefes.js) lo oye como un arrastre
      for (const v of this.tv ? [this.view, this.tv] : [this.view]) { v.cx += (dx * A.mapSens.pan) / v.s; v.cy -= (dy * A.mapSens.pan) / v.s; this._clamp(v); }
      this.dirty = this.fxDirty = true;
    }
    tapAt(px, py) { this._tap(px, py); }
    _pinchState() { const [a, b] = [...this.pointers.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; }
    _tap(px, py) {
      if (!this.pickEnabled) return;
      if (this.zzUntil && performance.now() < this.zzUntil) return;                 // Ctrl+Z: durante el rebobinado no se aceptan clics (el reloj devuelve ese tiempo)
      if (this.dist.spec && this.dist.spec.deal && this.dist.k < 0.999) return;   // Continentes barajados: mientras se reparten, el mapa esta casi vacio (el reloj devuelve ese tiempo)
      const rx = px, ry = py;
      const ef = A.pointer && A.pointer.effective && A.pointer.effective(); if (ef) { px = ef[0]; py = ef[1]; }     // el puntero puede tener retos (temblor, retraso, invertido...)
      let [x, y] = this._toWorld(px, py); [x, y] = this._undisp(x, y); const [lon, lat] = this._real(x, y);
      if (lon < -180 || lon > 180 || lat > 90 || lat < -90) return;
      this.pickCt = this.lastCt;                                         // marco del clic: la chincheta y el anillo del Sonar se dibujan justo donde has tocado
      if (this.lastCt != null) { const w = this._toWorld(px, py)[0], f = this._dispFwd(x, y, this.lastCt)[0]; this.pickCt = this.lastCt + 8 * (Math.round((w - f) / TWO_PI) + 2); }   // y en la copia del mundo que tocaste: junto al borde (la curva CRT ensena algo mas del mundo) se ven las dos y la chincheta salia en la otra
      /* para el crupier (js/dealer.js): donde estaba tu raton de verdad y donde habrias clicado en el mapa sin girar ni mover continentes */
      try { const v = this.viewJ || this.view; this.lastTap = { raw: ef ? this.screenToLonLat(rx, ry) : [lon, lat], plain: unproject(v.cx + (px - this.W / 2) / v.s, v.cy - (py - this.H / 2) / v.s), at: performance.now() }; } catch (e) { this.lastTap = null; }
      this.onPick(lon, lat);
    }

    /* ---------- bucle: fisica de camara, velocidades y dibujo ---------- */
    /* Vigilante de rendimiento. Solo mira la MEDIANA de los intervalos entre fotogramas en ventanas de ~3 s y baja la calidad si hay dos ventanas seguidas por debajo de ~27 fps.
       (Antes comparaba con el intervalo minimo visto: en pantallas con algo de irregularidad, lo normal parecia "lento" y la resolucion subia y bajaba: parpadeo.) */
    _adapt(now) {
      const raw = now - (this._rawT || now); this._rawT = now;
      if (this.quality !== "auto" || raw <= 0 || raw >= 250 || document.hidden) return;
      const W = this._win; W.push(raw); if (W.length < 180) return;
      const s = W.slice().sort((a, b) => a - b), med = s[90]; W.length = 0;
      if (med > 37) { if (++this.slow >= 2 && now - this._degAt > 6000) { this.slow = 0; this._degAt = now; this._degrade(); } } else this.slow = 0;
    }
    _degrade() {
      if (this.rsCap > 0.7) this.rsCap = Math.max(0.7, +(this.rsCap - 0.15).toFixed(2));
      else if (this.idleMs < 66) this.idleMs = 66;
      else return;
      this.resize(true);
    }
    /* tapado del todo por una pantalla opaca (Ajustes, Enciclopedia): no se dibuja lo que no se ve. Al destaparse, se redibuja en ese mismo fotograma */
    setHold(on) { this.hold = !!on; this._holdN = 0; if (!on) this.dirty = this.fxDirty = true; }
    _frame(now) {
      if (!this.lost && this.gl.isContextLost()) this.lost = true;             // por si el aviso de perdida no llego
      if (this.lost) {
        /* se espera un poco a que el navegador lo restaure solo; si en 1,5 s de fotogramas visibles no vuelve (o el rescate falla), lienzo nuevo cada 3 s */
        if (!this._lostSeen) this._lostSeen = now;
        else if (now - this._lostSeen > 1500) { this._lostSeen = now + 1500; if (!this._revive()) return; }
        else return;
        if (this.lost) return;
      }
      if (this.hold) { this.lastT = this._rawT = now; if (!(this.holdCheck && ++this._holdN % 15 === 0 && !this.holdCheck())) return; }
      const dt = this.lastT ? Math.min(0.05, (now - this.lastT) / 1000) : 0.016; this.lastT = now;
      this._tNow = now; this._adapt(now); this._stepDistort(now); this._stepMotion(now, dt);
      { const sp = this.dist.spec; if (sp && sp.spin && (this.dist.kk || 0) > 0.001) this.dirty = this.fxDirty = true; }   // Ruleta: el giro es continuo, cada fotograma (a 25 fps se veia a saltos y las chinchetas se quedaban atras)
      if (this.anim) {
        const a = this.anim, k = Math.min(1, (now - a.t0) / a.ms), e = easeIO(k), dip = 1 - a.dip * Math.sin(Math.PI * e);
        this.view = { cx: a.from.cx + (a.to.cx - a.from.cx) * e, cy: a.from.cy + (a.to.cy - a.from.cy) * e, s: Math.max(this.minS, a.from.s * Math.pow(a.to.s / a.from.s, e) * dip) };
        if (k >= 1) this.anim = null; this.dirty = this.fxDirty = true;
      } else if (this.tv) {
        const k = 1 - Math.exp(-dt * 13), v = this.view, t = this.tv;
        v.cx += (t.cx - v.cx) * k; v.cy += (t.cy - v.cy) * k; v.s *= Math.pow(t.s / v.s, k);
        if (Math.abs(Math.log(t.s / v.s)) < 0.0004 && Math.hypot(t.cx - v.cx, t.cy - v.cy) * v.s < 0.15) { this.view = { ...t }; this.tv = null; }
        this._clamp(this.view); this.dirty = this.fxDirty = true;
      } else if (this.inertia) {
        const I = this.inertia; this.view.cx += I.vx * dt; this.view.cy += I.vy * dt; const f = Math.exp(-dt * 4.2); I.vx *= f; I.vy *= f;
        this._clamp(this.view); this.dirty = this.fxDirty = true; if (Math.hypot(I.vx, I.vy) * this.view.s < 8) this.inertia = null;
      } else if (this.drift) {
        /* la deriva sale de donde se paro el mapa, sin salto (antes empezaba con cy desplazado sin(1) * 0,16 y el mapa se recolocaba de golpe
           1,5 s despues de abrir la portada) y arranca despacio: el reloj u acelera durante los primeros 4 s, asi la velocidad crece desde 0 */
        const t = (now - this.drift.t0) / 1000, u = t < 4 ? t * t / 8 : t - 2, b = this.drift.base;
        this.view = this._clamp({ cx: b.cx + Math.sin(u * 0.09) * 1.1, cy: b.cy + Math.sin(u * 0.07) * 0.16, s: b.s }); this.dirty = this.fxDirty = true;
      }
      // velocidades (para efectos y sonido)
      const lz = Math.log(this.view.s);
      if (this.lastLz !== null && dt > 0) {
        const zv = (lz - this.lastLz) / dt, k = 1 - Math.exp(-dt * 16); this.zv += (zv - this.zv) * k;
        const pvx = ((this.view.cx - this.lastView.cx) * this.view.s) / dt, pvy = (-(this.view.cy - this.lastView.cy) * this.view.s) / dt;
        this.pv[0] += (pvx - this.pv[0]) * k; this.pv[1] += (pvy - this.pv[1]) * k;
      }
      this.lastLz = lz; this.lastView = { ...this.view };
      const active = Math.abs(this.zv) > 0.012 || Math.hypot(this.pv[0], this.pv[1]) > 4;
      if (!active) { this.zv = 0; this.pv = [0, 0]; } else this.dirty = true;
      if (this.onMotion) this.onMotion(this.zv, Math.hypot(this.pv[0], this.pv[1]));

      const m = this.marks;
      if (m.guess || m.answer || (this.pickEnabled && this.mouse && !this.hideReticle)) this.fxDirty = true;
      if (m.highlight && now - m.t0 < 700) this.dirty = true;
      if (this.sk.animated && this.fxOn !== false && !this.pointers.size && now - this._lastDraw >= this.idleMs) this.dirty = true;   // fondo animado: ~25 fps en reposo
      if (this.dirty) { this.dirty = false; this._drawGL(now); if (this.onView) this.onView(this.view); }
      if (this.fxDirty) { this.fxDirty = false; this._drawFx(now); }
    }

    /* ---------- dibujo GL ---------- */
    _u(p, name, ...v) {
      const gl = this.gl, loc = p.u[name]; if (loc === undefined) return;
      const n = v.length;
      if (n === 1) gl.uniform1f(loc, v[0]); else if (n === 2) gl.uniform2f(loc, v[0], v[1]); else if (n === 3) gl.uniform3f(loc, v[0], v[1], v[2]); else gl.uniform4f(loc, v[0], v[1], v[2], v[3]);
    }
    /* lupa (Sello de aduana / Teodolito) en pixeles del objetivo de dibujo: [x, y, radio] (radio 0 = sin lupa) */
    _lensU(k, H, e) {
      if (!(this.lens && this.lens.r > 0 && this.dist.spec && (e.wob > 0.002 || e.lineA < 0.98))) return [0, 0, 0];
      const [lx, ly] = this._crt(this.lens.x, this.lens.y); return [lx * k, (H - ly) * k, this.lens.r * k];   // la escena ya se pinta girada: solo la curva CRT
    }
    _gridParams() {
      const STEPS = [0.25, 0.5, 1, 2, 5, 10, 15, 30], pxDeg = this.view.s * D2R, MIN = 84;
      let i = STEPS.findIndex(s => s * pxDeg >= MIN); if (i < 0) i = STEPS.length - 1;
      const a = STEPS[i], b = STEPS[Math.max(0, i - 1)];
      const sp = b * pxDeg, t = i === 0 ? 0 : clamp((sp - MIN * 0.45) / (MIN * 0.55), 0, 1);
      return { a, b, t };
    }
    _drawGL(now) {
      const gl = this.gl, v = this.viewJ || this.view, W = this.W, H = this.H, dpr = this.cdpr, ms = this.ms, P = this.P, st = this.sk; this._lastDraw = now;
      const mos = this.dist.spec && this.dist.spec.mosaic ? Math.min(1, 1 - (1 - this.dist.spec.mosaic) * Math.min(1, this.dist.kk || 0)) : 1;   // pixeles gordos: menos resolucion del lienzo
      const RS = Math.min(this.rs, mos);
      const sw = Math.max(2, Math.round(W * dpr * RS)), sh = Math.max(2, Math.round(H * dpr * RS));
      const scale = t => v.s * (t / W);                                  // px por unidad en un objetivo de ancho t
      const silW = Math.max(2, Math.round(W / 3)), silH = Math.max(2, Math.round(H / 3));
      const sil = this._target("sil", silW, silH), bA = this._target("bA", silW, silH), bN = this._target("bN", silW, silH), bW = this._target("bW", silW, silH);
      const scene = this._target("scene", sw, sh, mos < 0.999 ? gl.NEAREST : gl.LINEAR);
      gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);

      // 0) fondo animado (remolino) a baja resolucion, ~24 fps
      let swT = null;
      if (st.style === 1) {
        swT = this._target("swirl", Math.max(2, Math.round(W / 4)), Math.max(2, Math.round(H / 4)));
        const fxo = this.fxOn !== false;
        if (!swT.ok || swT.fx !== fxo || (fxo && now - swT.at >= 41)) {
          swT.ok = true; swT.fx = fxo; swT.at = now;
          gl.bindFramebuffer(gl.FRAMEBUFFER, swT.fbo); gl.viewport(0, 0, swT.w, swT.h); gl.useProgram(P.swirl); gl.bindVertexArray(this.vaoEmpty);
          this._u(P.swirl, "u_res", swT.w, swT.h); this._u(P.swirl, "u_time", fxo ? now / 1000 : 0);
          this._u(P.swirl, "u_sw1", ...ms.sw[0]); this._u(P.swirl, "u_sw2", ...ms.sw[1]); this._u(P.swirl, "u_sw3", ...ms.sw[2]);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
      }

      // 1) silueta de tierra a baja resolucion (solo se repite si la vista o las deformaciones cambian)
      const e0 = this._eff(), key = [v.cx, v.cy, v.s, silW, silH, ...e0.sh, ...e0.rot, ...e0.sc, ...e0.cen, e0.oa, e0.mx];   // la silueta va girada con el mapa (aguas someras y sombreado de costa en su sitio)
      const same = this._silKey && this._silTex === bW.tex && this._silKey.length === key.length && this._silKey.every((x, i) => x === key[i]);
      if (!same) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, sil.fbo); gl.viewport(0, 0, silW, silH); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(P.sil); this._setDist(P.sil); this._u(P.sil, "u_off", 0, 0); this._u(P.sil, "u_center", v.cx, v.cy); this._u(P.sil, "u_scale", scale(silW)); this._u(P.sil, "u_res", silW, silH);
      gl.bindVertexArray(this.vaoFill); gl.drawElements(gl.TRIANGLES, this.idxCount, gl.UNSIGNED_INT, 0);

      // 2) desenfoques (estrecho y ancho) en la GPU: ancho constante en pantalla
      gl.bindVertexArray(this.vaoEmpty); gl.useProgram(P.blur);
      const blur = (src, dst, dx, dy) => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo); gl.viewport(0, 0, silW, silH); gl.bindTexture(gl.TEXTURE_2D, src.tex);
        this._u(P.blur, "u_dir", dx / silW, dy / silH); this._u(P.blur, "u_res", silW, silH); gl.drawArrays(gl.TRIANGLES, 0, 3);
      };
      gl.activeTexture(gl.TEXTURE0); gl.uniform1i(P.blur.u.u_tex, 0);
      blur(sil, bA, 1, 0); blur(bA, bN, 0, 1);       // estrecho
      blur(bN, bA, 3.2, 0); blur(bA, bW, 0, 3.2);    // ancho
      this._silKey = key; this._silTex = bW.tex;
      }

      // 3) escena: oceano + reticula, tierra, fronteras, resalte
      gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fbo); gl.viewport(0, 0, sw, sh);
      const sc = scale(sw), gp = this._gridParams();
      gl.useProgram(P.ocean); gl.bindVertexArray(this.vaoEmpty);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, bN.tex); gl.uniform1i(P.ocean.u.u_blurN, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, bW.tex); gl.uniform1i(P.ocean.u.u_blurW, 1);
      if (swT) { gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, swT.tex); gl.uniform1i(P.ocean.u.u_swirl, 2); }
      this._u(P.ocean, "u_center", v.cx, v.cy); this._u(P.ocean, "u_scale", sc); this._u(P.ocean, "u_res", sw, sh); this._u(P.ocean, "u_dpr", dpr * RS); this._setDist(P.ocean);
      this._u(P.ocean, "u_oTop", ...ms.oTop); this._u(P.ocean, "u_oBot", ...ms.oBot); this._u(P.ocean, "u_shallow", ...ms.shallow); this._u(P.ocean, "u_grid", ...ms.grid); this._u(P.ocean, "u_tropic", ...ms.tropic);
      this._u(P.ocean, "u_gp", gp.a, gp.b, gp.t, st.gridA);
      this._u(P.ocean, "u_time", this.fxOn === false ? 0 : now / 1000); gl.uniform1i(P.ocean.u.u_style, st.style || 0);
      this._u(P.ocean, "u_sw1", ...ms.sw[0]); this._u(P.ocean, "u_sw2", ...ms.sw[1]); this._u(P.ocean, "u_sw3", ...ms.sw[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindVertexArray(this.vaoFill);
      if (st.shadow) {                                               // sombra dura de "pegatina" bajo la tierra
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.useProgram(P.solid); this._setDist(P.solid);
        this._u(P.solid, "u_center", v.cx, v.cy); this._u(P.solid, "u_scale", sc); this._u(P.solid, "u_res", sw, sh);
        this._u(P.solid, "u_off", st.shadow.off[0] * dpr * RS, st.shadow.off[1] * dpr * RS); this._u(P.solid, "u_col", ...st.shadow.col);
        gl.drawElements(gl.TRIANGLES, this.idxCount, gl.UNSIGNED_INT, 0); gl.disable(gl.BLEND);
      }
      gl.useProgram(P.land); this._setDist(P.land); this._u(P.land, "u_off", 0, 0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, bN.tex); gl.uniform1i(P.land.u.u_blurN, 0);
      gl.uniform1i(P.land.u.u_style, st.style || 0); this._u(P.land, "u_dpr", dpr * RS);
      { const ef = this._eff(), fl = ef.flat != null ? ef.flat : Math.max(0, 1 - ef.lineA), lu = this._lensU(dpr * RS, H, ef); this._u(P.land, "u_flat", fl); this._u(P.land, "u_flatc", ...ms.pal[0]); this._u(P.land, "u_lens", lu[0], lu[1], lu[2]); }
      this._u(P.land, "u_center", v.cx, v.cy); this._u(P.land, "u_scale", sc); this._u(P.land, "u_res", sw, sh); this._u(P.land, "u_fx", st.ao, st.grain, 0, 0);
      if (this._palFor !== ms) { this._palFor = ms; this._pal = new Float32Array(24); ms.pal.forEach((c, i) => this._pal.set(c, i * 3)); } gl.uniform3fv(P.land.u.u_pal, this._pal);
      gl.drawElements(gl.TRIANGLES, this.idxCount, gl.UNSIGNED_INT, 0);

      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      if (this.paint) {                                                  // tintes por pais (setPaint): encima de la tierra y debajo del resalte y las fronteras
        gl.useProgram(P.solid); this._setDist(P.solid); this._u(P.solid, "u_off", 0, 0);
        this._u(P.solid, "u_center", v.cx, v.cy); this._u(P.solid, "u_scale", sc); this._u(P.solid, "u_res", sw, sh);
        for (const f of this.world.features) { const c = this.paint[f.name]; if (c && f.gl && f.gl.n) { this._u(P.solid, "u_col", c[0], c[1], c[2], c[3]); gl.drawElements(gl.TRIANGLES, f.gl.n, gl.UNSIGNED_INT, f.gl.i0 * 4); } }
      }
      const hl = this.marks.highlight && this.world.byName[this.marks.highlight];
      if (hl) {
        const k = Math.min(1, (now - this.marks.t0) / 500);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.useProgram(P.hatch); this._setDist(P.hatch); this._u(P.hatch, "u_off", 0, 0);
        this._u(P.hatch, "u_center", v.cx, v.cy); this._u(P.hatch, "u_scale", sc); this._u(P.hatch, "u_res", sw, sh); this._u(P.hatch, "u_col", ...ms.hl); this._u(P.hatch, "u_dpr", dpr * RS); this._u(P.hatch, "u_alpha", k);
        gl.drawElements(gl.TRIANGLES, hl.gl.n, gl.UNSIGNED_INT, hl.gl.i0 * 4);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      }
      // fronteras
      gl.useProgram(P.line); gl.bindVertexArray(this.vaoLine); this._setDist(P.line);
      { const e = this._eff(); this._u(P.line, "u_wob", e.wob); this._u(P.line, "u_wt", now / 1400); this._u(P.line, "u_lineA", e.lineA); }
      this._u(P.line, "u_center", v.cx, v.cy); this._u(P.line, "u_scale", sc); this._u(P.line, "u_res", sw, sh);
      const lw = clamp(st.lineW + Math.log2(v.s / this.minS) * 0.06, st.lineW, st.lineW * 1.7) * dpr * RS;
      const lcov = mos < 0.999 ? clamp((lw - 0.2) / 0.8, 0, 1) : 1;    // pixeles gordos: a tan poca resolucion las fronteras desaparecen como en una foto de verdad (antes se amontonaban y el mapa quedaba en manchas de tinta)
      if (st.lineOff && (st.lineOff[0] || st.lineOff[1])) {           // desregistro (impresion): segunda capa desplazada
        this._u(P.line, "u_width", lw); this._u(P.line, "u_off", st.lineOff[0] * dpr * RS, st.lineOff[1] * dpr * RS); this._u(P.line, "u_col", st.lineOffCol[0], st.lineOffCol[1], st.lineOffCol[2], st.lineOffCol[3] * lcov);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.segCount);
      }
      this._u(P.line, "u_width", lw); this._u(P.line, "u_off", 0, 0); this._u(P.line, "u_col", st.line[0], st.line[1], st.line[2], st.line[3] * lcov);
      const lensOn = this.lens && this.lens.r > 0 && this.dist.spec && (this._eff().wob > 0.002 || this._eff().lineA < 0.98);
      if (lensOn) {                                                     // fuera de la lupa: fronteras deformadas; dentro: las verdaderas
        const [lx, ly] = this._crt(this.lens.x, this.lens.y), k = dpr * RS, e = this._eff();
        this._u(P.line, "u_lens", lx * k, (H - ly) * k, this.lens.r * k);
        this._u(P.line, "u_lmode", 1); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.segCount);
        this._u(P.line, "u_wob", 0); this._u(P.line, "u_lineA", 1); this._u(P.line, "u_lmode", 2); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.segCount);
        this._u(P.line, "u_lmode", 0); this._u(P.line, "u_wob", e.wob); this._u(P.line, "u_lineA", e.lineA);
      } else { this._u(P.line, "u_lmode", 0); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.segCount); }
      if (hl && hl.gl.sn) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.segBuf); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 16, hl.gl.s0 * 16);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sctBuf); gl.vertexAttribPointer(2, 1, gl.UNSIGNED_BYTE, false, 0, hl.gl.s0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.brdBuf); gl.vertexAttribPointer(3, 1, gl.UNSIGNED_BYTE, false, 0, hl.gl.s0);   // ct y borde de los segmentos del resaltado
        this._u(P.line, "u_width", 3.2 * dpr * RS); this._u(P.line, "u_col", ...ms.hl, 1); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, hl.gl.sn);
        this._u(P.line, "u_width", 1.1 * dpr * RS); this._u(P.line, "u_col", ...hex(st.paper), 1); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, hl.gl.sn);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.segBuf); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 16, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sctBuf); gl.vertexAttribPointer(2, 1, gl.UNSIGNED_BYTE, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.brdBuf); gl.vertexAttribPointer(3, 1, gl.UNSIGNED_BYTE, false, 0, 0);
      }
      gl.disable(gl.BLEND);

      // 4) post-proceso a pantalla: desenfoque radial y aberracion segun velocidad de zoom, viñeta y grano
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.cv.width, this.cv.height);
      gl.useProgram(P.post); gl.bindVertexArray(this.vaoEmpty);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, scene.tex); gl.uniform1i(P.post.u.u_scene, 0);
      const zc = this.zc || [W / 2, H / 2];
      this._u(P.post, "u_res", this.cv.width, this.cv.height); this._u(P.post, "u_zc", zc[0] * dpr, (H - zc[1]) * dpr);
      const fxk = this.fxOn === false ? 0 : 1;
      this._u(P.post, "u_zv", this.zv * fxk); this._u(P.post, "u_pv", this.pv[0] * dpr * 0.06 * fxk, -this.pv[1] * dpr * 0.06 * fxk);
      this._u(P.post, "u_crt", st.crt ? 1 : 0); this._u(P.post, "u_lite", this.lite ? 1 : 0); this._u(P.post, "u_dpr", dpr);
      this._u(P.post, "u_vig", st.vignette); this._u(P.post, "u_grain", st.postGrain); this._u(P.post, "u_tint", ...st.tint); this._u(P.post, "u_time", now / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    /* ---------- capa 2D: retícula (etiquetas), chinchetas, linea, etiquetas y cursor ---------- */
    _drawGridLabels(c) {
      const { W, H } = this, gp = this._gridParams();
      this._setFont(c, `400 10px ${this._fm()}`); c.textBaseline = "top";
      /* cada rotulo sobre su linea de la reticula en el borde donde se escribe (con la curva CRT, la linea se curva hacia los bordes) */
      const [wx0, wyB] = this._toWorld(0, H - 12), [wx1] = this._toWorld(W, H - 12), [wxL, wyTop] = this._toWorld(12, 0), [, wyBot] = this._toWorld(12, H);
      const latTop = unproject(0, wyTop)[1], latBot = unproject(0, wyBot)[1];
      const draw = (step, alpha) => {
        if (alpha < 0.03) return;
        c.fillStyle = `rgba(190,225,230,${0.55 * alpha})`;
        const lon0 = Math.max(-180, Math.floor(wx0 / D2R / step) * step), lon1 = Math.min(180, Math.ceil(wx1 / D2R / step) * step);
        for (let lo = lon0; lo <= lon1 + 1e-9; lo += step) if (Math.abs(lo % 30) < 1e-9 || step < 30) c.fillText(fmtCoord(lo, "E", "W").replace(".00", ""), this.toScreen(lo * D2R, wyB)[0] + 4, H - 16);
        const lat0 = Math.max(-90, Math.floor(latBot / step) * step), lat1 = Math.min(90, Math.ceil(latTop / step) * step);
        for (let la = lat0; la <= lat1 + 1e-9; la += step) if (Math.abs(la % 30) < 1e-9 || step < 30) c.fillText(fmtCoord(la, "N", "S").replace(".00", ""), 8, this.toScreen(wxL, project(0, la)[1])[1] + 3);   // la reticula no se deforma: antes cada latitud se movia con el continente del meridiano 0 y salian desordenadas
      };
      draw(gp.a, 1); if (gp.b !== gp.a) draw(gp.b, gp.t);
    }
    /* territorio de una masa de agua (js/aguas.js) al responder: su borde invisible se dibuja como el resalte de un pais. El trazado en pantalla se guarda
       mientras la camara no se mueve */
    _drawArea(c, m, now) {
      const f = m.area, v = this.viewJ || this.view, key = v.cx + "," + v.cy + "," + v.s + "," + this.W + "," + this.H, live = this.dist.spec && this._moved();
      if (live) { this.dirty = true; return; }                          // con los continentes aun movidos el agua (que no se mueve) se rasgaria: se dibuja cuando el mapa vuelve a su sitio
      let A_ = this._areaP;
      if (!A_ || A_.f !== f || A_.key !== key) {
        const path = new Path2D(), edge = new Path2D(), W = this.W, H = this.H;
        for (const sh of [-360, 0, 360]) for (const p of f.polys) {
          const b = p.bbox, q1 = this.lonLatToScreen(b[0] + sh, b[1]), q2 = this.lonLatToScreen(b[2] + sh, b[3]);
          if (Math.max(q1[0], q2[0]) < -W || Math.min(q1[0], q2[0]) > 2 * W || Math.max(q1[1], q2[1]) < -H || Math.min(q1[1], q2[1]) > 2 * H) continue;   // fuera de la vista (con margen)
          for (const ring of p.rings) { let lo0 = 0; ring.forEach(([lo, la], i) => { const q = this.lonLatToScreen(lo + sh, la); i ? path.lineTo(q[0], q[1]) : path.moveTo(q[0], q[1]); i && !(Math.abs(lo) >= 179.999 && Math.abs(lo0) >= 179.999) ? edge.lineTo(q[0], q[1]) : edge.moveTo(q[0], q[1]); lo0 = lo; }); path.closePath(); }
        }
        A_ = this._areaP = { f, key, path, edge };
      }
      const k = Math.min(1, (now - m.t0) / 500), sk = this.sk;
      c.save(); c.globalAlpha = k; c.fillStyle = this._rgba(sk.red, 0.2); c.fill(A_.path, "evenodd");
      c.lineJoin = "round"; c.strokeStyle = this._rgba(sk.red, 0.95); c.lineWidth = 2.6; c.stroke(A_.edge);
      c.strokeStyle = this._rgba(sk.paper, 0.8); c.lineWidth = 0.9; c.stroke(A_.edge); c.restore();
      if (now - m.t0 < 700) this.dirty = true;
    }
    _drawFx(now) {
      const { fctx: c, W, H, dpr } = this, m = this.marks, sk = this.sk;
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
      if (!this._orient().on) this._drawGridLabels(c);
      if (this.probes.length) this._drawProbes(c, now);
      if (m.area) this._drawArea(c, m, now);
      const age = now - m.t0;
      if (m.guess || m.answer || m.labelAt) {
        const G = m.guess && this.lonLatToScreen(m.guess[0], m.guess[1], m.gct), Aa = m.answer && this.lonLatToScreen(m.answer[0], m.answer[1]);
        const fl = m.flags && m.flags.length ? m.flags : null;           // v0.2.15: acierto con bandera (la chincheta del objetivo pasa a mastil)
        if (Aa && m.rings) this._rings(c, m, Aa, age);                    // anillos de la Enciclopedia, debajo de todo
        const ds = G && Aa ? this._line(c, m, G, Aa, age) : null;
        if (Aa) {
          const k = clamp((age - 480) / 600, 0, 1);
          if (age > 480) {
            const t = ((age - 480) % 1900) / 1900;
            c.strokeStyle = `rgba(242,233,214,${0.85 * (1 - t)})`; c.lineWidth = 2.5; c.beginPath(); c.arc(Aa[0], Aa[1], 10 + t * 48, 0, Math.PI * 2); c.stroke();
            c.strokeStyle = this._rgba(sk.red, 0.6 * (1 - t)); c.lineWidth = 2; c.beginPath(); c.arc(Aa[0], Aa[1], 8 + t * 30, 0, Math.PI * 2); c.stroke();
          }
          if (!fl) this._pin(c, Aa[0], Aa[1], sk.red, sk.paper, age - 480, k);
        }
        if (G) this._pin(c, G[0], G[1], sk.ink, sk.paper, age, 1);
        const at = Aa || (m.labelAt && this.lonLatToScreen(m.labelAt[0], m.labelAt[1], m.act));
        if (fl && at) this._flagPole(c, fl, at[0], at[1], age, now);      // encima de tu chincheta: la bandera es el premio
        if (ds) this._distChip(c, m, ds, age);                            // encima de las chinchetas (antes quedaba debajo y la tapaba el pin de la respuesta)
        if (at && m.label && age > 520) {
          const g = fl && this._flagGeom(fl.length), lx = g ? at[0] + g.cx : at[0], ly = g ? at[1] - g.h - 17 : at[1] - (Aa ? 66 : 10);
          this._chip(c, m.label, lx, ly, { center: true, font: `italic 700 17px ${this._fd()}`, alpha: Math.min(1, (age - 520) / 300) });
        }
        if (G && m.pop && age > 700) {
          const t = Math.min(1, (age - 700) / 1700), y = G[1] - 52 - easeIO(t) * 46;
          c.save(); c.globalAlpha = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
          this._setFont(c, `900 34px ${this._fd()}`); c.textAlign = "center"; c.lineJoin = "round";
          c.lineWidth = 7; c.strokeStyle = sk.ink; c.strokeText(m.pop, G[0], y); c.fillStyle = sk.paper; c.fillText(m.pop, G[0], y); c.restore();
        }
      }
      if (this.decoys && this.decoys.length) {                          // tanda 7: con t0, la chincheta cae del cielo a su hora (y la capa sigue animada mientras caen)
        let live = false;
        for (const d of this.decoys) { const age = d.t0 ? now - d.t0 : 2000; if (age < 0) { live = true; continue; } if (age < 1400) live = true; const q = this.lonLatToScreen(d.lon, d.lat); c.save(); c.globalAlpha = d.chip ? 1 : d.a == null ? 0.9 : d.a; if (d.chip) this._tokenRain(c, q[0], q[1], age); else if (d.bank != null) { this._pinRain(c, q[0], q[1], "#f8b449", sk.paper, age); if (age > 760) this._chip(c, d.bankLabel, q[0], q[1] - 64, { center: true, font: `italic 700 17px ${this._fd()}`, alpha: Math.min(1, (age - 760) / 300) }); } else this._pinRain(c, q[0], q[1], sk.red, sk.paper, age); c.restore(); }
        if (live) this.fxDirty = true;
      }
      if (this.pickEnabled && this.mouse && !this.pointers.size && !this.hideReticle) this._reticle(c, this.mouse.x, this.mouse.y);
    }
    _drawProbes(c, now) { if (A.drawProbes(this, c, now)) this.fxDirty = true; }   // el borde discontinuo y el latido se animan
    /* familias de letra del tema: solo cambian con el idioma o el tema, asi que se leen del CSS una vez (leerlas en cada fotograma forzaba
       un recalculo de estilos de la pagina entera en mitad del dibujo del mapa, justo cuando una pantalla nueva estaba entrando) */
    _font(v, def) { const h = document.documentElement, key = h.lang + "|" + h.dataset.skin; if (this._fk !== key) { this._fk = key; this._fc = {}; } return this._fc[v] || (this._fc[v] = getComputedStyle(h).getPropertyValue(v) || def); }
    _fd() { return this._font("--serif", "Jersey 15, sans-serif"); }
    /* poner la letra del lienzo obliga al navegador a recalcular los estilos de la pagina (aunque sea la misma): solo si cambia de verdad.
       Se compara con como la guarda el lienzo (su forma normalizada); si llega una fuente nueva, se vuelve a poner */
    _setFont(c, f) {
      if (!this._fser) { this._fser = new Map(); if (document.fonts) document.fonts.addEventListener("loadingdone", () => this._fser.clear()); }
      const s = this._fser.get(f); if (s !== undefined && c.font === s) return; c.font = f; this._fser.set(f, c.font);
    }
    _fm() { return this._font("--mono", "'DM Mono', monospace"); }
    _rgba(h, a) { const [r, g, b] = hex(h); return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`; }
    _line(c, m, G, Aa, age) {
      const k = clamp((age - 300) / 500, 0, 1), e = easeIO(k); if (k <= 0) return;
      c.save(); c.setLineDash([1, 9]); c.lineCap = "round"; c.lineWidth = 4; c.strokeStyle = this._rgba(this.sk.ink, 0.9);
      const segs = [];
      for (const s of [-360, 0, 360]) {
        if (Math.abs(m.guess[0] + s - m.answer[0]) <= 180) segs.push([this.lonLatToScreen(m.guess[0] + s, m.guess[1], m.gct), Aa]);
        if (s !== 0 && Math.abs(m.answer[0] + s - m.guess[0]) <= 180) segs.push([G, this.lonLatToScreen(m.answer[0] + s, m.answer[1])]);
      }
      const trace = () => { c.beginPath(); for (const [a, b] of segs) { c.moveTo(a[0], a[1]); c.lineTo(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e); } c.stroke(); };
      trace(); c.lineWidth = 1.5; c.strokeStyle = this._rgba(this.sk.paper, 0.7); c.lineDashOffset = 5; trace(); c.restore();
      return m.dist && k >= 1 ? segs[0] : null;
    }
    /* etiqueta de distancia: en medio de la linea; si las dos chinchetas quedan cerca (la cabeza del pin sube ~40 px), debajo de las dos puntas */
    _distChip(c, m, [a, b], age) {
      const near = Math.hypot(b[0] - a[0], b[1] - a[1]) < 130, x = (a[0] + b[0]) / 2, y = near ? Math.max(a[1], b[1]) + 26 : (a[1] + b[1]) / 2;
      this._chip(c, m.dist, x, y, { font: `500 12px ${this._fm()}`, center: true, alpha: Math.min(1, (age - 800) / 250) });
    }
    _chip(c, text, x, y, o = {}) {
      c.save(); c.globalAlpha = o.alpha == null ? 1 : o.alpha; this._setFont(c, o.font || "600 14px sans-serif");
      const w = c.measureText(text).width + 22, h = 28, cut = 6, sk = this.sk;
      let rx = o.center ? x - w / 2 : x, ry = y - h / 2; rx = clamp(rx, 8, this.W - w - 8); ry = clamp(ry, 8, this.H - h - 8);
      const path = () => { c.beginPath(); c.moveTo(rx + cut, ry); c.lineTo(rx + w - cut, ry); c.lineTo(rx + w, ry + cut); c.lineTo(rx + w, ry + h - cut); c.lineTo(rx + w - cut, ry + h); c.lineTo(rx + cut, ry + h); c.lineTo(rx, ry + h - cut); c.lineTo(rx, ry + cut); c.closePath(); };
      c.shadowColor = "rgba(0,0,0,.4)"; c.shadowBlur = 10; c.shadowOffsetY = 3; path(); c.fillStyle = sk.paper; c.fill();
      c.shadowColor = "transparent"; c.strokeStyle = sk.ink; c.lineWidth = 1.3; c.stroke();
      c.fillStyle = sk.ink; c.textBaseline = "middle"; c.fillText(text, rx + 11, ry + h / 2 + 1); c.restore();
    }
    /* v0.2.15, bandera del acierto: el mastil es el de las banderas pixel de la Enciclopedia (assets/flags/p, 64x64 celdas: pomo y mastil en las
       columnas 4-9, tela en la 10-58), alargado FLAG_EXT celdas para que la bandera suba por el. Cada celda ocupa k pixeles FISICOS enteros
       (nitido a cualquier escala de Windows); u = celda en px CSS. Medidas desde la base del mastil (el punto exacto del objetivo) */
    _flagGeom(n = 1) {
      const k = Math.max(1, Math.round(this.dpr)), u = k / this.dpr;
      return { k, u, h: (58 + FLAG_EXT) * u, cx: (n > 1 ? -4 : 24) * u };    // h: alto hasta el pomo; cx: centro de la(s) bandera(s) respecto a la base
    }
    /* el mastil sale del suelo (200 ms), la tela sube hasta arriba con un pequeno rebote y ondea por columnas, a saltos de una celda.
       Dos paises (K2, el lago Titicaca...): dos mastiles, el segundo a la izquierda y un poco despues */
    /* la tela ondeando, ya dibujada: 12 fases de la onda en una hoja (por imagen y escala), para pintar 1 imagen por fotograma en vez de 49 columnas.
       Cada columna sube o baja una celda, mas cuanto mas lejos del mastil (junto a el no se mueve). game.js la prepara al cargar la bandera, en un rato libre */
    prepFlag(img, k = Math.max(1, Math.round(this.dpr))) {
      if (!img || !img.complete || !img.naturalWidth) return null;
      const key = "_fs" + k; if (img[key]) return img[key];
      const S = img.naturalWidth / 64, N = 12, fw = 49 * k, fh = 51 * k, cv = document.createElement("canvas"); cv.width = fw * N; cv.height = fh;
      const g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
      for (let p = 0; p < N; p++) for (let cc = 10; cc <= 58; cc++) {
        const wv = Math.round(Math.sin((p / N) * TWO_PI - cc * 0.34) * 1.3 * ((cc - 10) / 48));
        g.drawImage(img, cc * S, 8 * S, S, 49 * S, p * fw + (cc - 10) * k, (1 + wv) * k, k, 49 * k);
      }
      return (img[key] = { cv, fw, fh, N });
    }
    /* el mastil sale del suelo (200 ms), la tela sube hasta arriba con un pequeno rebote y ondea a saltos de una celda (12 fases por vuelta).
       Dos paises (K2, el lago Titicaca...): dos mastiles, el segundo a la izquierda y un poco despues */
    _flagPole(c, imgs, x, y, age, now) {
      const a0 = age - 480; if (a0 < 0) return;
      const { k } = this._flagGeom(), dpr = this.dpr, E = FLAG_EXT;
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
      imgs.forEach((img, i) => {
        const a = a0 - i * 140; if (a < 0 || !img || !img.complete || !img.naturalWidth) return;
        const S = img.naturalWidth / 64, ox = Math.round(x * dpr - (7.5 + i * 56) * k), base = Math.round(y * dpr), oy = base - (61 + E) * k;
        const g = 1 - Math.pow(1 - clamp(a / 200, 0, 1), 3), sink = Math.round((58 + E) * (1 - g)) * k;   // filas que faltan por salir del suelo
        const bx = ox + 7.5 * k;
        c.fillStyle = "rgba(0,0,0,.32)"; c.beginPath(); c.ellipse(bx, base + dpr, (5 + 4 * g) * dpr, (2 + 1.6 * g) * dpr, 0, 0, Math.PI * 2); c.fill();
        c.save(); c.beginPath(); c.rect(ox - 8 * k, 0, 72 * k, base + k); c.clip();          // el mastil asoma del suelo: nada por debajo de la base
        const col = (sr, n, dr, dn) => c.drawImage(img, 4 * S, sr * S, 6 * S, n * S, ox + 4 * k, oy + dr * k + sink, 6 * k, (dn || n) * k);
        col(3, 57, 3); col(30, 1, 60, E); col(60, 1, 60 + E);                // pomo y mastil (filas 3-59), tramo alargado (la fila 30 repetida) y pie
        /* la tela: sube desde el pie (3 + E celdas) en 440 ms con un rebote de una celda */
        const h = clamp((a - 170) / 440, 0, 1), sh = h > 0 && this.prepFlag(img, k);
        if (sh) {
          const e = h < 1 ? 1 + 2.2 * Math.pow(h - 1, 3) + 1.2 * Math.pow(h - 1, 2) : 1, dy = Math.round((1 - e) * (3 + E));
          const p = ((Math.floor(((now / 150 + i) / TWO_PI) * sh.N) % sh.N) + sh.N) % sh.N;
          c.drawImage(sh.cv, p * sh.fw, 0, sh.fw, sh.fh, ox + 10 * k, oy + (7 + dy) * k + sink, sh.fw, sh.fh);
        }
        c.restore();
      });
      c.restore();
    }
    /* anillos de la Enciclopedia: 300/150/75 km (lo de esta pregunta: m.rings.r) alrededor del objetivo. Crecen al revelar, se encienden de fuera a
       dentro con el color de su medalla (bronce, plata y oro) al compas de los jackpots (m.rings.at, ms desde el revelado; m.rings.n = los que
       alcanzaste) y se apagan solos a los pocos segundos. Los puntos del circulo se calculan una vez y, con la camara quieta, tambien su sitio en pantalla */
    _rings(c, m, A0, age) {
      const R = m.rings, ans = m.answer, T0 = 520, END = 5600; if (age < T0 || age > END + 900) return;
      if (R.ct === undefined) R.ct = this.dist.spec && this._moved() ? this._ctOf(ans[0], ans[1]) : null;   // una vez: en el mar, _ctOf recorre el mundo entero
      if (!R.ll) R.ll = R.r.map(km => { const out = []; for (let j = 0; j <= 80; j++) { let [lo, la] = destLL(ans[1], ans[0], (j / 80) * 360, km); lo += 360 * Math.round((ans[0] - lo) / 360); out.push(lo, la); } return out; });   // junto al antimeridiano no se parte
      const v = this.viewJ || this.view, key = this.dist.spec ? null : v.cx + "|" + v.cy + "|" + v.s + "|" + this.W + "|" + this.H;
      if (!key || R.key !== key) { R.key = key; R.xy = R.ll.map(L => { const o = new Float32Array(L.length); for (let j = 0; j < L.length; j += 2) { const q = this.lonLatToScreen(L[j], L[j + 1], R.ct); o[j] = q[0]; o[j + 1] = q[1]; } return o; }); }
      const grow = easeIO(clamp((age - T0) / 560, 0, 1)), sc = 0.55 + 0.45 * grow, fade = 1 - clamp((age - END) / 900, 0, 1), sk = this.sk, MED = ["#c98a4b", "#dfe6ec", "#f8c64a"];
      c.save(); c.lineJoin = "round";
      for (let i = 0; i < 3; i++) {
        const on = R.n > i && age >= R.at[i], f = on ? clamp((age - R.at[i]) / 260, 0, 1) : 0, P = R.xy[i];
        c.beginPath();
        for (let j = 0; j < P.length; j += 2) { const px = A0[0] + (P[j] - A0[0]) * sc, py = A0[1] + (P[j + 1] - A0[1]) * sc; j ? c.lineTo(px, py) : c.moveTo(px, py); }   // al crecer, a escala desde el objetivo
        c.closePath();
        if (on) { const p = 1 + 1.5 * (1 - f) * (1 - f); c.globalAlpha = fade; c.lineWidth = 6 * p; c.strokeStyle = this._rgba(sk.ink, 0.8); c.stroke(); c.lineWidth = 3 * p; c.strokeStyle = MED[i]; c.stroke(); }
        else { c.setLineDash([2, 7]); c.lineCap = "round"; c.globalAlpha = 0.85 * grow * fade; c.lineWidth = 3.4; c.strokeStyle = this._rgba(sk.ink, 0.7); c.stroke(); c.lineWidth = 1.3; c.strokeStyle = this._rgba(sk.paper, 0.95); c.stroke(); c.setLineDash([]); c.lineCap = "butt"; }   // dos tonos, como la linea de distancia: se ve en tierra clara y en el mar
      }
      c.restore();
    }
    _pin(c, x, y, fill, ring, age, alpha, noShadow) {
      if (age < 0 || alpha <= 0) return;
      const k = Math.min(1, age / 520), drop = (1 - easeOutBounce(k)) * -90;
      c.save(); c.globalAlpha = alpha;
      if (!noShadow) { c.fillStyle = "rgba(0,0,0,.32)"; c.beginPath(); c.ellipse(x, y + 1, 9 * (0.4 + 0.6 * k), 3.6 * (0.4 + 0.6 * k), 0, 0, Math.PI * 2); c.fill(); }
      c.translate(x, y + drop);
      c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-4, -10, -13, -15, -13, -26); c.arc(0, -26, 13, Math.PI, 0); c.bezierCurveTo(13, -15, 4, -10, 0, 0); c.closePath();
      c.fillStyle = fill; c.fill(); c.lineWidth = 2.5; c.strokeStyle = ring; c.stroke();
      c.beginPath(); c.arc(0, -26, 4.6, 0, Math.PI * 2); c.fillStyle = ring; c.fill(); c.restore();
    }
    /* tanda 7: Chinchetas trampa que llueven: caen desde arriba de la pantalla (acelerando y girando), se clavan con un rebote y levantan polvo */
    _pinRain(c, x, y, fill, ring, age) {
      const F = 620;
      if (age >= F + 700) return this._pin(c, x, y, fill, ring, 2000, 1);
      if (age < F) {
        const k = age / F, yy = y - (y + 70) * (1 - k * k), rot = (1 - k) * 0.9 * (Math.sin(x * 0.37) > 0 ? 1 : -1);
        c.save(); c.fillStyle = `rgba(0,0,0,${(0.06 + 0.26 * k).toFixed(3)})`; c.beginPath(); c.ellipse(x, y + 1, 9 * (0.3 + 0.7 * k), 3.6 * (0.3 + 0.7 * k), 0, 0, Math.PI * 2); c.fill();
        c.translate(x, yy); c.rotate(rot); this._pin(c, 0, 0, fill, ring, 2000, 1, true); c.restore();
        return;
      }
      const b = age - F, hop = -Math.abs(Math.sin((b / 150) * Math.PI)) * 10 * Math.exp(-b / 160);
      this._pin(c, x, y + hop, fill, ring, 2000, 1);
      if (b < 360) { const q = b / 360; c.save(); c.fillStyle = `rgba(240,225,200,${(0.5 * (1 - q)).toFixed(3)})`; for (let i = 0; i < 6; i++) { const a = Math.PI + (i / 5) * Math.PI, d = 6 + q * 18; c.beginPath(); c.arc(x + Math.cos(a) * d * 1.4, y + Math.sin(a) * d * 0.5, 2.2 * (1 - q) + 0.6, 0, Math.PI * 2); c.fill(); } c.restore(); }
    }
    /* tanda 10: la ficha dorada del Pase VIP (marca un punto con su centro): cae, bota y brilla al posarse */
    _token(c, x, y, noShadow) {
      const T = Math.PI * 2, ink = this.sk.ink; c.save();
      if (!noShadow) { c.fillStyle = "rgba(0,0,0,.32)"; c.beginPath(); c.ellipse(x, y + 12, 10, 3.4, 0, 0, T); c.fill(); }
      c.beginPath(); c.arc(x, y, 12.5, 0, T); c.fillStyle = ink; c.fill();
      c.beginPath(); c.arc(x, y, 11, 0, T); c.fillStyle = "#f8b449"; c.fill();
      c.fillStyle = "#fff4d6"; for (let k = 0; k < 6; k++) { c.save(); c.translate(x, y); c.rotate((k / 6) * T); c.fillRect(-1.8, -11, 3.6, 3.6); c.restore(); }
      c.beginPath(); c.arc(x, y, 6.4, 0, T); c.fillStyle = "#c97f22"; c.fill(); c.lineWidth = 1.3; c.strokeStyle = ink; c.stroke();
      c.beginPath(); c.arc(x - 3.6, y - 4, 2.2, 0, T); c.fillStyle = "rgba(255,255,255,.8)"; c.fill();
      c.restore();
    }
    _tokenRain(c, x, y, age) {
      const F = 480;
      if (age >= F + 600) return this._token(c, x, y);
      if (age < F) { const k = age / F; c.save(); c.fillStyle = `rgba(0,0,0,${(0.06 + 0.24 * k).toFixed(3)})`; c.beginPath(); c.ellipse(x, y + 12, 10 * (0.3 + 0.7 * k), 3.4 * (0.3 + 0.7 * k), 0, 0, Math.PI * 2); c.fill(); c.restore(); return this._token(c, x, y - (y + 40) * (1 - k * k), true); }
      const b = age - F; this._token(c, x, y - Math.abs(Math.sin((b / 130) * Math.PI)) * 8 * Math.exp(-b / 140));
      if (b < 320) { const q = b / 320; c.save(); c.strokeStyle = `rgba(255,215,120,${(0.85 * (1 - q)).toFixed(3)})`; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 13 + q * 16, 0, Math.PI * 2); c.stroke(); c.restore(); }
    }
    _reticle(c, x, y) {
      const sk = this.sk;
      c.save(); c.lineWidth = 1; c.setLineDash([2, 6]); c.strokeStyle = this._rgba(sk.paper, 0.28);
      c.beginPath(); c.moveTo(0, y); c.lineTo(x - 22, y); c.moveTo(x + 22, y); c.lineTo(this.W, y); c.moveTo(x, 0); c.lineTo(x, y - 22); c.moveTo(x, y + 22); c.lineTo(x, this.H); c.stroke();
      c.setLineDash([]); c.strokeStyle = sk.paper; c.lineWidth = 1.6; c.beginPath(); c.arc(x, y, 14, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(x - 22, y); c.lineTo(x - 8, y); c.moveTo(x + 8, y); c.lineTo(x + 22, y); c.moveTo(x, y - 22); c.lineTo(x, y - 8); c.moveTo(x, y + 8); c.lineTo(x, y + 22); c.stroke();
      c.fillStyle = sk.red; c.beginPath(); c.arc(x, y, 2.6, 0, Math.PI * 2); c.fill();
      c.fillStyle = sk.brass; c.beginPath(); c.moveTo(x - 5, 0); c.lineTo(x + 5, 0); c.lineTo(x, 8); c.fill(); c.beginPath(); c.moveTo(0, y - 5); c.lineTo(0, y + 5); c.lineTo(8, y); c.fill();
      const [wx, wy] = this._toWorld(x, y), [lon, lat] = unproject(wx, wy);
      if (Math.abs(lon) <= 180 && Math.abs(lat) <= 90) {
        const txt = fmtCoord(lat, "N", "S") + "  " + fmtCoord(lon, "E", "W");
        this._setFont(c, `500 11px ${this._fm()}`); const w = c.measureText(txt).width + 14;
        let bx = x + 20, by = y + 18; if (bx + w > this.W - 6) bx = x - 20 - w; if (by + 22 > this.H - 6) by = y - 40;
        c.fillStyle = this._rgba(sk.ink, 0.9); c.fillRect(bx, by, w, 22); c.fillStyle = sk.paper; c.textBaseline = "middle"; c.fillText(txt, bx + 7, by + 12);
      }
      c.restore();
    }

    /* miniatura de una region (vectorial 2D, una sola vez) */
    drawThumb(cv, spec) {
      const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || 120, h = cv.clientHeight || 76;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      const c = cv.getContext("2d"), st = this.sk;
      const g = c.createLinearGradient(0, 0, 0, cv.height); g.addColorStop(0, st.oceanTop); g.addColorStop(1, st.oceanBot); c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height);
      const [x, y] = project(spec.lon, spec.lat), z = Math.max(1, spec.zoom * 0.85), uw = (BX1 - BX0) / z, k = cv.width / uw;
      c.setTransform(k, 0, 0, -k, cv.width / 2 - x * k, cv.height / 2 + y * k);
      /* solo los paises que caen en la miniatura (antes se rellenaba el mundo entero en cada una: las 11 del Clasico costaban un fotograma) */
      const m = 2 / k, xl = x - uw / 2 - m, xr = x + uw / 2 + m, hh = cv.height / k / 2 + m, yb = y - hh, yt = y + hh;
      for (const f of this.world.features) { if (!f.wrap && (f.px1 < xl || f.px0 > xr || f.py1 < yb || f.py0 > yt)) continue; c.fillStyle = st.land[f.ci] || st.land[0]; c.fill(f.path); }
      c.setTransform(1, 0, 0, 1, 0, 0);
      const px = cv.width / 2, py = cv.height / 2;
      if (spec.mark !== false) { c.strokeStyle = st.red; c.lineWidth = 2 * dpr; c.beginPath(); c.arc(px, py, 6 * dpr, 0, Math.PI * 2); c.stroke(); c.fillStyle = st.red; c.beginPath(); c.arc(px, py, 2 * dpr, 0, Math.PI * 2); c.fill(); }   // mark:false = miniatura de region (campanas), sin punto
    }
  }
  A.MapViewGL = MapViewGL;

  /* fabrica: GPU si se puede, 2D si no */
  A.createMap = (canvas, world, onPick) => {
    if (!/[?&]nogl/.test(location.search) && MapViewGL.supported()) return new MapViewGL(canvas, world, onPick);
    document.documentElement.classList.add("no-webgl");
    return new A.MapView2D(canvas, world, onPick);
  };
})(window.AIQ);
