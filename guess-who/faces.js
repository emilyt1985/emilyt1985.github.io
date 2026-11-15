// Draws a cartoon portrait from a person's traits (SVG string).
//
// Traits (all optional):
//   age:     baby | kid | teen | adult | older       (default adult)
//   face:    oval | round | square | long            (default oval)
//   skin:    0-5 (light to dark)
//   hair:    black | darkbrown | brown | lightbrown | blonde | strawberry | red | gray | white
//   style:   short | crew | long | bob | bangs | wavy | curly | bun | tuft | spiky | bald
//   eyes:    dark | blue | green | brown | hazel
//   smile:   teeth | closed | grin                    (default teeth)
//   brows:   thin | normal | thick
//   glasses: true | 'sun'         glassesColor: any CSS color
//   facial:  beard | mustache | goatee | stubble
//   hat:     cap | beanie | fedora   hatColor: any CSS color
//   earrings, noseRing, headband, freckles, lipstick: true
//   shirt:   red | blue | green | yellow | purple | teal | maroon | white | gray | orange | lightblue | navy
//   collar:  crew | v | shirt                        (default crew)

const SKIN = ['#f7dcc8', '#efc3a1', '#dca47c', '#bb7f57', '#8d5a3b', '#5e3b26'];
const HAIR = {
  black: '#231b17', darkbrown: '#3f2a1d', brown: '#6b4226', lightbrown: '#a47a4f',
  blonde: '#e3bd5c', strawberry: '#cf8a4e', red: '#b8451f', gray: '#a7a7a7', white: '#e9e7e1',
};
const SHIRT = {
  red: '#d9534a', blue: '#4a7fd6', green: '#4caf6e', yellow: '#efbd33', purple: '#8b5fc7', teal: '#2aa5a0',
  maroon: '#8e2f3c', white: '#f4f1ea', gray: '#9a9ba3', orange: '#f08a3c', lightblue: '#a9d3ef', navy: '#2d3e7a',
};
const EYES = { dark: '#3a2a20', blue: '#4a8fd4', green: '#5b9a63', brown: '#6b4428', hazel: '#8a7a3a' };
const BG = ['#fde9d9', '#e3f0fb', '#e8f6e9', '#fbf3d5', '#efe6fa', '#ddf3f1', '#fbe3ea'];

function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }

// lighten (amt > 0) or darken (amt < 0) a hex color
function shade(hex, amt) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt))));
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(f).map((c) => c.toString(16).padStart(2, '0')).join('');
}

export function faceSVG(p) {
  const id = 'f' + hash(JSON.stringify(p)).toString(36); // unique gradient ids per portrait
  const age = p.age || (p.kid ? 'kid' : 'adult');
  const little = age === 'baby' || age === 'kid';
  const skin = SKIN[p.skin ?? 1] || SKIN[1];
  const hair = HAIR[p.hair] || HAIR.brown;
  const light = hair === HAIR.white || hair === HAIR.gray;
  const shirt = SHIRT[p.shirt] || p.shirt || SHIRT.blue;
  const eye = EYES[p.eyes] || EYES.dark;
  const bg = BG[hash(p.name || '') % BG.length];
  const style = p.style || 'short';

  // head geometry
  const cx = 50;
  const shape = p.face || 'oval';
  let rx = { oval: 23, round: 25, square: 24, long: 22 }[shape] || 23;
  let ry = { oval: 27, round: 25.5, square: 26, long: 29.5 }[shape] || 27;
  let cy = 55;
  if (age === 'baby') { rx = 26; ry = 25; cy = 59; }
  if (age === 'kid') { rx = 25; ry = 25.5; cy = 57; }
  const top = cy - ry, L = cx - rx, R = cx + rx, chin = cy + ry;
  const ey = cy + (little ? 1 : -1);   // eye line
  const ex = little ? 10.5 : 9.5;       // eye offset from center
  const my = cy + (little ? 14 : 15.5); // mouth line

  const o = [];
  o.push(`<defs>
    <radialGradient id="${id}bg" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="${shade(bg, 0.5)}"/><stop offset="1" stop-color="${bg}"/></radialGradient>
    <radialGradient id="${id}sk" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="${shade(skin, 0.12)}"/><stop offset="1" stop-color="${shade(skin, -0.1)}"/></radialGradient>
    <linearGradient id="${id}hr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(hair, light ? 0.2 : 0.18)}"/><stop offset="1" stop-color="${shade(hair, -0.18)}"/></linearGradient>
    <linearGradient id="${id}sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(shirt, 0.08)}"/><stop offset="1" stop-color="${shade(shirt, -0.18)}"/></linearGradient>
  </defs>`);
  o.push(`<rect width="100" height="120" fill="url(#${id}bg)"/>`);
  const H = `url(#${id}hr)`;

  // ---- hair behind the head ----
  if (style === 'long') o.push(`<path d="M${L - 2} ${cy - 6} Q${L - 9} ${cy + 38} ${L + 3} ${cy + 55} L${R - 3} ${cy + 55} Q${R + 9} ${cy + 38} ${R + 2} ${cy - 6} Z" fill="${H}"/>`);
  if (style === 'bob' || style === 'bangs') o.push(`<path d="M${L - 2} ${cy - 6} Q${L - 6} ${cy + 22} ${L + 2} ${cy + 27} Q${cx} ${cy + 31} ${R - 2} ${cy + 27} Q${R + 6} ${cy + 22} ${R + 2} ${cy - 6} Z" fill="${H}"/>`);
  if (style === 'wavy') o.push(`<path d="M${L - 2} ${cy - 6} Q${L - 9} ${cy + 12} ${L - 4} ${cy + 24} Q${L - 9} ${cy + 34} ${L + 2} ${cy + 40} L${R - 2} ${cy + 40} Q${R + 9} ${cy + 34} ${R + 4} ${cy + 24} Q${R + 9} ${cy + 12} ${R + 2} ${cy - 6} Z" fill="${H}"/>`);
  if (style === 'curly') {
    o.push(`<path d="M${L - 3} ${cy - 8} Q${L - 10} ${cy + 20} ${L - 2} ${cy + 36} L${R + 2} ${cy + 36} Q${R + 10} ${cy + 20} ${R + 3} ${cy - 8} Z" fill="${H}"/>`);
    for (let i = 0; i < 7; i++) {
      const y = cy - 8 + i * 7, wob = (i % 2) * 2.5;
      o.push(`<circle cx="${L - 4 - wob}" cy="${y}" r="5.5" fill="${H}"/><circle cx="${R + 4 + wob}" cy="${y}" r="5.5" fill="${H}"/>`);
      o.push(`<path d="M${L - 7 - wob} ${y} q3 -3 6 0 M${R + 1 + wob} ${y} q3 -3 6 0" stroke="${shade(hair, 0.3)}" stroke-width=".9" fill="none" opacity=".6"/>`);
    }
  }

  // ---- shoulders, neck ----
  const sw = little ? 25 : 36;
  o.push(`<path d="M${cx - sw - 2} 121 Q${cx - sw} ${chin + 9} ${cx} ${chin + 6} Q${cx + sw} ${chin + 9} ${cx + sw + 2} 121 Z" fill="url(#${id}sh)"/>`);
  o.push(`<path d="M${cx - 7} ${chin - 6} L${cx - 7} ${chin + 6} Q${cx} ${chin + 9} ${cx + 7} ${chin + 6} L${cx + 7} ${chin - 6} Z" fill="${shade(skin, -0.12)}"/>`);
  const collar = p.collar || (p.shirt === 'white' ? 'shirt' : 'crew');
  const cb = chin - 4; // collar base
  if (collar === 'crew') o.push(`<path d="M${cx - 9} ${cb + 9} Q${cx} ${cb + 16} ${cx + 9} ${cb + 9}" stroke="${shade(shirt, -0.25)}" stroke-width="2" fill="none"/>`);
  if (collar === 'v') o.push(`<path d="M${cx - 8} ${cb + 8} L${cx} ${cb + 20} L${cx + 8} ${cb + 8}" fill="${shade(skin, -0.12)}" stroke="${shade(shirt, -0.25)}" stroke-width="1.6"/>`);
  if (collar === 'shirt') o.push(`<path d="M${cx - 9} ${cb + 7} L${cx - 13} ${cb + 17} L${cx - 2} ${cb + 15} Z M${cx + 9} ${cb + 7} L${cx + 13} ${cb + 17} L${cx + 2} ${cb + 15} Z" fill="${shade(shirt, 0.15)}" stroke="${shade(shirt, -0.2)}" stroke-width="1"/><path d="M${cx} ${cb + 14} L${cx} 121" stroke="${shade(shirt, -0.2)}" stroke-width="1"/>`);

  // ---- ears, head ----
  o.push(`<ellipse cx="${L + 1}" cy="${ey + 3}" rx="4.5" ry="6" fill="${shade(skin, -0.05)}"/><ellipse cx="${R - 1}" cy="${ey + 3}" rx="4.5" ry="6" fill="${shade(skin, -0.05)}"/>`);
  o.push(`<path d="M${L + 0.5} ${ey + 1} q-2 2 0 5 M${R - 0.5} ${ey + 1} q2 2 0 5" stroke="${shade(skin, -0.25)}" stroke-width="1" fill="none"/>`);
  if (shape === 'square' && !little)
    o.push(`<path d="M${L} ${cy - 4} Q${L} ${top} ${cx} ${top} Q${R} ${top} ${R} ${cy - 4} L${R - 1} ${cy + 10} Q${R - 5} ${chin} ${cx} ${chin} Q${L + 5} ${chin} ${L + 1} ${cy + 10} Z" fill="url(#${id}sk)"/>`);
  else o.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id}sk)"/>`);

  // ---- facial hair under the features ----
  const fh = light ? HAIR.white : hair;
  if (p.facial === 'beard') o.push(`<path d="M${L + 1} ${cy} Q${L + 2} ${chin + 6} ${cx} ${chin + 7} Q${R - 2} ${chin + 6} ${R - 1} ${cy} Q${R - 5} ${my + 4} ${cx} ${my + 4} Q${L + 5} ${my + 4} ${L + 1} ${cy}Z" fill="${H}"/>`);
  if (p.facial === 'stubble') o.push(`<path d="M${L + 3} ${cy + 4} Q${L + 4} ${chin + 2} ${cx} ${chin + 2} Q${R - 4} ${chin + 2} ${R - 3} ${cy + 4} Q${R - 7} ${my + 6} ${cx} ${my + 6} Q${L + 7} ${my + 6} ${L + 3} ${cy + 4}Z" fill="${hair}" opacity=".18"/>`);
  if (p.facial === 'goatee') o.push(`<path d="M${cx - 9} ${my - 3} Q${cx} ${my - 7} ${cx + 9} ${my - 3} L${cx + 8} ${my + 1} Q${cx + 6} ${my + 5} ${cx + 5} ${my + 10} Q${cx} ${chin + 6} ${cx - 5} ${my + 10} Q${cx - 6} ${my + 5} ${cx - 8} ${my + 1} Z" fill="${fh}"/>`);

  // ---- hair on top ----
  const capHair = `M${L - 1.5} ${cy - 1} Q${L - 3} ${top - 4} ${cx} ${top - 4} Q${R + 3} ${top - 4} ${R + 1.5} ${cy - 1} Q${R - 2} ${top + 10} ${cx + 6} ${top + 9} Q${cx - 4} ${top + 15} ${L + 3} ${top + 12} Q${L} ${cy - 10} ${L - 1.5} ${cy - 1} Z`;
  if (!p.hat || p.hat === 'fedora') {
    if (['short', 'long', 'bob', 'bun', 'wavy', 'tuft', 'bangs'].includes(style)) o.push(`<path d="${capHair}" fill="${H}"/>`);
    if (style === 'crew') o.push(`<path d="M${L + 1} ${cy - 6} Q${L} ${top - 1} ${cx} ${top - 1} Q${R} ${top - 1} ${R - 1} ${cy - 6} Q${R - 3} ${top + 8} ${cx} ${top + 7} Q${L + 3} ${top + 8} ${L + 1} ${cy - 6} Z" fill="${H}" opacity=".95"/>`);
    if (style === 'bangs') o.push(`<path d="M${L + 2} ${top + 15} Q${L + 2} ${top} ${cx} ${top - 1} Q${R - 2} ${top} ${R - 2} ${top + 15} L${R - 7} ${top + 13} L${R - 12} ${top + 15.5} L${cx + 2} ${top + 13} L${cx - 4} ${top + 15.5} L${cx - 9} ${top + 13} L${L + 7} ${top + 15.5} Z" fill="${H}"/>`);
    if (style === 'bun') o.push(`<ellipse cx="${cx}" cy="${top - 5}" rx="9" ry="8" fill="${H}"/><path d="M${cx - 6} ${top - 7} q6 -4 12 0" stroke="${shade(hair, 0.35)}" stroke-width="1.2" fill="none" opacity=".6"/>`);
    if (style === 'tuft') o.push(`<path d="M${cx - 3} ${top + 1} Q${cx - 5} ${top - 9} ${cx + 1} ${top - 13} Q${cx} ${top - 6} ${cx + 5} ${top - 4} Q${cx + 3} ${top - 1} ${cx + 3} ${top + 1} Z" fill="${H}"/>`);
    if (style === 'spiky') o.push(`<path d="M${L - 1} ${cy - 3} L${L + 1} ${top + 2} L${L + 8} ${top + 6} L${L + 11} ${top - 6} L${cx - 4} ${top + 3} L${cx + 1} ${top - 8} L${cx + 6} ${top + 3} L${R - 10} ${top - 5} L${R - 7} ${top + 6} L${R - 1} ${top + 2} L${R + 1} ${cy - 3} Q${R - 3} ${top + 10} ${cx} ${top + 9} Q${L + 3} ${top + 10} ${L - 1} ${cy - 3} Z" fill="${H}"/>`);
    if (style === 'curly') for (let i = 0; i < 8; i++) { const x = L - 1 + i * ((rx * 2 + 2) / 7), y = top + 4 + Math.abs(i - 3.5) * 2.4; o.push(`<circle cx="${x}" cy="${y}" r="6.2" fill="${H}"/><path d="M${x - 3} ${y} q3 -3 6 0" stroke="${shade(hair, 0.3)}" stroke-width=".9" fill="none" opacity=".6"/>`); }
    if (style === 'bald') {
      o.push(`<path d="M${L + 0.5} ${cy + 1} Q${L - 1} ${cy - 9} ${L + 3} ${cy - 13} L${L + 4} ${cy + 2} Z M${R - 0.5} ${cy + 1} Q${R + 1} ${cy - 9} ${R - 3} ${cy - 13} L${R - 4} ${cy + 2} Z" fill="${H}"/>`);
      o.push(`<ellipse cx="${cx - 7}" cy="${top + 7}" rx="8" ry="3.5" fill="#fff" opacity=".3"/>`);
    }
    // a soft highlight strand on full heads of hair
    if (!['bald', 'crew'].includes(style)) o.push(`<path d="M${cx - 12} ${top + 3} Q${cx} ${top - 3} ${cx + 12} ${top + 2}" stroke="#fff" stroke-width="1.6" fill="none" opacity=".22" stroke-linecap="round"/>`);
  }
  if (p.headband) o.push(`<path d="M${L - 1} ${cy - 8} Q${L} ${top - 4} ${cx} ${top - 4} Q${R} ${top - 4} ${R + 1} ${cy - 8}" stroke="#2f3338" stroke-width="4" fill="none"/>`);

  // ---- brows ----
  const bw = { thin: 1.4, normal: 2.2, thick: 3.2 }[p.brows || (little ? 'thin' : 'normal')];
  const browC = light ? '#9a9a9a' : shade(hair, -0.1);
  o.push(`<path d="M${cx - ex - 4.5} ${ey - 7} Q${cx - ex} ${ey - 9.5} ${cx - ex + 4.5} ${ey - 7.5} M${cx + ex - 4.5} ${ey - 7.5} Q${cx + ex} ${ey - 9.5} ${cx + ex + 4.5} ${ey - 7}" stroke="${browC}" stroke-width="${bw}" fill="none" stroke-linecap="round"/>`);

  // ---- eyes ----
  const er = little ? 1.2 : 1;
  for (const s of [-1, 1]) {
    const x = cx + s * ex;
    o.push(`<ellipse cx="${x}" cy="${ey}" rx="${4.3 * er}" ry="${3.5 * er}" fill="#fff"/>`);
    o.push(`<circle cx="${x}" cy="${ey + 0.2}" r="${2.6 * er}" fill="${eye}"/><circle cx="${x}" cy="${ey + 0.2}" r="${1.3 * er}" fill="#141414"/>`);
    o.push(`<circle cx="${x + 0.9}" cy="${ey - 0.9}" r="${0.9 * er}" fill="#fff"/>`);
    o.push(`<path d="M${x - 4.5 * er} ${ey} Q${x} ${ey - 4.6 * er} ${x + 4.5 * er} ${ey}" stroke="#3a2a22" stroke-width="1.1" fill="none"/>`);
    if (age === 'older') o.push(`<path d="M${x + s * 5.5} ${ey - 1} l${s * 2.5} -1.2 M${x + s * 5.5} ${ey + 1} l${s * 2.8} 0.6 M${x - 3} ${ey + 4} Q${x} ${ey + 5.5} ${x + 3} ${ey + 4}" stroke="${shade(skin, -0.28)}" stroke-width=".8" fill="none" stroke-linecap="round"/>`);
  }

  // ---- nose ----
  const ns = little ? 0.7 : 1;
  o.push(`<path d="M${cx - 1} ${ey + 3} Q${cx - 2.5 * ns} ${ey + 9 * ns} ${cx - 3.5 * ns} ${ey + 10 * ns} Q${cx} ${ey + 12.5 * ns} ${cx + 3.5 * ns} ${ey + 10 * ns}" stroke="${shade(skin, -0.3)}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`);
  o.push(`<ellipse cx="${cx}" cy="${ey + 10.5 * ns}" rx="${4 * ns}" ry="${2 * ns}" fill="${shade(skin, -0.12)}" opacity=".5"/>`);
  if (p.noseRing) o.push(`<circle cx="${cx + 3.2 * ns}" cy="${ey + 10.8 * ns}" r="1.5" fill="none" stroke="#d4d4d4" stroke-width="0.9"/>`);

  // ---- cheeks, freckles, smile lines ----
  o.push(`<ellipse cx="${cx - ex - 3}" cy="${my - 6}" rx="${little ? 5 : 4}" ry="${little ? 3.4 : 2.6}" fill="#f08a8a" opacity="${little ? 0.35 : 0.22}"/><ellipse cx="${cx + ex + 3}" cy="${my - 6}" rx="${little ? 5 : 4}" ry="${little ? 3.4 : 2.6}" fill="#f08a8a" opacity="${little ? 0.35 : 0.22}"/>`);
  if (p.freckles) for (const [dx, dy] of [[-12, -7], [-9, -5], [-14, -4], [12, -7], [9, -5], [14, -4]]) o.push(`<circle cx="${cx + dx}" cy="${my + dy}" r=".7" fill="${shade(skin, -0.35)}"/>`);
  if (age === 'older') o.push(`<path d="M${cx - 8} ${ey + 9} Q${cx - 11} ${my - 2} ${cx - 9} ${my + 2} M${cx + 8} ${ey + 9} Q${cx + 11} ${my - 2} ${cx + 9} ${my + 2}" stroke="${shade(skin, -0.25)}" stroke-width=".9" fill="none" stroke-linecap="round"/>`);

  // ---- mustache, mouth ----
  if (p.facial === 'mustache') o.push(`<path d="M${cx - 8} ${my - 1} Q${cx - 4} ${my - 6} ${cx} ${my - 3.5} Q${cx + 4} ${my - 6} ${cx + 8} ${my - 1} Q${cx} ${my - 2.5} ${cx - 8} ${my - 1}Z" fill="${fh}"/>`);
  const lip = p.lipstick ? '#c0415a' : shade(skin, -0.32);
  const smile = p.smile || 'teeth';
  if (smile === 'closed') o.push(`<path d="M${cx - 7.5} ${my} Q${cx} ${my + 5.5} ${cx + 7.5} ${my}" stroke="${p.lipstick ? '#c0415a' : '#9a4a44'}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`);
  else {
    const w = smile === 'grin' ? 9.5 : 8, d = smile === 'grin' ? 9.5 : 7.5;
    o.push(`<path d="M${cx - w} ${my - 0.5} Q${cx} ${my + d} ${cx + w} ${my - 0.5} Q${cx} ${my + 1.2} ${cx - w} ${my - 0.5} Z" fill="#7d2f33"/>`);
    if (age !== 'baby') o.push(`<path d="M${cx - w + 1.2} ${my - 0.1} Q${cx} ${my + 2.6} ${cx + w - 1.2} ${my - 0.1} Q${cx} ${my + 1.1} ${cx - w + 1.2} ${my - 0.1} Z" fill="#fff"/>`);
    else o.push(`<ellipse cx="${cx}" cy="${my + d * 0.55}" rx="3" ry="1.6" fill="#e07a85"/>`);
    if (p.lipstick) o.push(`<path d="M${cx - w} ${my - 0.5} Q${cx} ${my + d} ${cx + w} ${my - 0.5}" stroke="${lip}" stroke-width="1.6" fill="none"/>`);
  }

  // ---- glasses, earrings ----
  if (p.glasses) {
    const gc = p.glassesColor || '#262626';
    const lens = p.glasses === 'sun' ? 'rgba(25,25,30,.88)' : 'rgba(255,255,255,.12)';
    o.push(`<g stroke="${gc}" stroke-width="2.1" fill="${lens}"><rect x="${cx - ex - 6.5}" y="${ey - 5.5}" width="13" height="10.5" rx="4.2"/><rect x="${cx + ex - 6.5}" y="${ey - 5.5}" width="13" height="10.5" rx="4.2"/><path d="M${cx - ex + 6.5} ${ey - 1} Q${cx} ${ey - 3} ${cx + ex - 6.5} ${ey - 1} M${cx - ex - 6.5} ${ey - 2} L${L + 1} ${ey - 3} M${cx + ex + 6.5} ${ey - 2} L${R - 1} ${ey - 3}" fill="none"/></g>`);
    o.push(`<path d="M${cx - ex - 4} ${ey - 3} l3 -1.5 M${cx + ex - 4} ${ey - 3} l3 -1.5" stroke="#fff" stroke-width="1.2" opacity=".55" stroke-linecap="round"/>`);
  }
  if (p.earrings) o.push(`<circle cx="${L + 1}" cy="${ey + 9.5}" r="2.3" fill="#f0c43a" stroke="#c99a1f" stroke-width=".6"/><circle cx="${R - 1}" cy="${ey + 9.5}" r="2.3" fill="#f0c43a" stroke="#c99a1f" stroke-width=".6"/>`);

  // ---- hats (hair peeks out at the sides) ----
  const hc = p.hatColor;
  if ((p.hat === 'cap' || p.hat === 'beanie') && style !== 'bald') o.push(`<path d="M${L - 1} ${cy - 10} Q${L - 3} ${cy + 2} ${L + 1} ${cy + 6} L${L + 4} ${cy - 10}Z M${R + 1} ${cy - 10} Q${R + 3} ${cy + 2} ${R - 1} ${cy + 6} L${R - 4} ${cy - 10}Z" fill="${H}"/>`);
  if (p.hat === 'cap') {
    const c = hc || '#d23c3c';
    o.push(`<path d="M${L - 2} ${top + 13} Q${L - 1} ${top - 7} ${cx} ${top - 7} Q${R + 1} ${top - 7} ${R + 2} ${top + 13} Z" fill="${c}"/>`);
    o.push(`<path d="M${cx} ${top - 7} L${cx} ${top + 12}" stroke="${shade(c, -0.25)}" stroke-width=".8"/><circle cx="${cx}" cy="${top - 6.5}" r="1.6" fill="${shade(c, -0.2)}"/>`);
    o.push(`<path d="M${L - 3} ${top + 13} Q${cx} ${top + 8} ${R + 3} ${top + 13} Q${cx} ${top + 21} ${L - 3} ${top + 13} Z" fill="${shade(c, -0.22)}"/>`);
  }
  if (p.hat === 'beanie') o.push(`<path d="M${L - 2} ${top + 13} Q${L - 2} ${top - 10} ${cx} ${top - 10} Q${R + 2} ${top - 10} ${R + 2} ${top + 13} Z" fill="${hc || '#3d8fb0'}"/><rect x="${L - 3}" y="${top + 7}" width="${rx * 2 + 6}" height="8" rx="4" fill="${shade(hc || '#3d8fb0', -0.2)}"/><circle cx="${cx}" cy="${top - 11}" r="5" fill="#f3f3f3"/>`);
  if (p.hat === 'fedora') o.push(`<ellipse cx="${cx}" cy="${top + 7}" rx="${rx + 13}" ry="5.5" fill="#4a3b2f"/><path d="M${cx - 17} ${top + 7} Q${cx - 17} ${top - 15} ${cx} ${top - 15} Q${cx + 17} ${top - 15} ${cx + 17} ${top + 7}Z" fill="#5c4a3a"/><rect x="${cx - 17}" y="${top}" width="34" height="5" fill="#2d241c"/>`);

  return `<svg viewBox="8 5 84 101" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${o.join('')}</svg>`;
}
