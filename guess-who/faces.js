// Draws a cartoon face from a person's traits (SVG string).
//
// Traits (all optional):
//   skin: 0-5                  hair: black|darkbrown|brown|lightbrown|blonde|strawberry|red|gray|white
//   style: short|crew|long|bob|bangs|wavy|curly|bun|tuft|spiky|bald
//   eyes: dark|blue|green|brown
//   glasses: true|'sun'        glassesColor: any CSS color (default dark)
//   facial: beard|mustache|goatee|stubble
//   hat: cap|beanie|fedora     hatColor: any CSS color
//   earrings, noseRing, headband: true
//   kid: true (rounder face, smaller shoulders)
//   shirt: red|blue|green|yellow|purple|teal|maroon|white|gray|orange|lightblue|navy

const SKIN = ['#f6d7c3', '#eebd9a', '#d9a27a', '#b97d55', '#8d5a3b', '#5e3b26'];
const HAIR = {
  black: '#231b17', darkbrown: '#3f2a1d', brown: '#6b4226', lightbrown: '#a47a4f',
  blonde: '#e6c15a', strawberry: '#cf8a4e', red: '#b8451f', gray: '#a9a9a9', white: '#ecebe6',
};
const SHIRT = {
  red: '#e05a4f', blue: '#4a7fd6', green: '#4caf6e', yellow: '#efbd33', purple: '#8b5fc7', teal: '#2aa5a0',
  maroon: '#8e2f3c', white: '#f4f1ea', gray: '#9a9ba3', orange: '#f08a3c', lightblue: '#a9d3ef', navy: '#2d3e7a',
};
const EYES = { dark: '#2b2b2b', blue: '#3c7cc4', green: '#4e8a5a', brown: '#5a3a22' };
const BG = ['#fde9d9', '#e3f0fb', '#e8f6e9', '#fbf3d5', '#efe6fa', '#ddf3f1', '#fbe3ea'];

function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }

export function faceSVG(p) {
  const skin = SKIN[p.skin ?? 1] || SKIN[1];
  const hair = HAIR[p.hair] || HAIR.brown;
  const shirt = SHIRT[p.shirt] || p.shirt || SHIRT.blue;
  const eye = EYES[p.eyes] || EYES.dark;
  const bg = BG[hash(p.name || '') % BG.length];
  const style = p.style || 'short';
  const light = hair === HAIR.white || hair === HAIR.gray;
  const kid = !!p.kid;
  const out = [];

  out.push(`<rect width="100" height="120" fill="${bg}"/>`);

  // hair behind the head
  if (style === 'long') out.push(`<path d="M23 52 Q18 98 30 110 L70 110 Q82 98 77 52 Z" fill="${hair}"/>`);
  if (style === 'bob' || style === 'bangs') out.push(`<path d="M23 50 Q20 80 28 84 L72 84 Q80 80 77 50 Z" fill="${hair}"/>`);
  if (style === 'wavy') out.push(`<path d="M23 50 Q17 70 22 82 Q18 92 28 96 L72 96 Q82 92 78 82 Q83 70 77 50 Z" fill="${hair}"/>`);
  if (style === 'curly') {
    for (const [x, y] of [[26, 46], [24, 60], [24, 74], [28, 88], [74, 46], [76, 60], [76, 74], [72, 88], [32, 34], [68, 34]])
      out.push(`<circle cx="${x}" cy="${y}" r="9" fill="${hair}"/>`);
  }

  // body, neck, ears, head
  out.push(kid
    ? `<path d="M22 120 Q25 98 50 96 Q75 98 78 120 Z" fill="${shirt}"/>`
    : `<path d="M12 120 Q16 92 50 90 Q84 92 88 120 Z" fill="${shirt}"/>`);
  if (shirt === SHIRT.white) out.push(`<path d="M42 92 L50 102 L58 92" stroke="#cfc8bb" stroke-width="2" fill="none"/>`);
  out.push(`<rect x="43" y="76" width="14" height="${kid ? 22 : 16}" rx="4" fill="${skin}"/>`);
  out.push(`<circle cx="26" cy="58" r="5" fill="${skin}"/><circle cx="74" cy="58" r="5" fill="${skin}"/>`);
  out.push(kid ? `<ellipse cx="50" cy="57" rx="25" ry="26" fill="${skin}"/>` : `<ellipse cx="50" cy="56" rx="24" ry="27" fill="${skin}"/>`);

  // facial hair that sits under the features
  if (p.facial === 'beard') out.push(`<path d="M26 56 Q27 88 50 88 Q73 88 74 56 Q70 74 50 75 Q30 74 26 56Z" fill="${hair}"/>`);
  if (p.facial === 'stubble') out.push(`<path d="M28 60 Q30 84 50 84 Q70 84 72 60 Q68 76 50 77 Q32 76 28 60Z" fill="${hair}" opacity=".16"/>`);
  if (p.facial === 'goatee') {
    const g = light ? HAIR.white : hair;
    out.push(`<path d="M40 69 Q50 64 60 69 L60 74 Q58 70 50 70 Q42 70 40 74Z" fill="${g}"/>`);
    out.push(`<path d="M41 74 Q42 88 50 90 Q58 88 59 74 Q56 80 50 80 Q44 80 41 74Z" fill="${g}"/>`);
  }

  // hair on top
  if (!p.hat || p.hat === 'fedora') {
    if (['short', 'long', 'bob', 'bun', 'wavy', 'tuft', 'bangs'].includes(style))
      out.push(`<path d="M25 52 Q24 26 50 26 Q76 26 75 52 Q72 38 50 37 Q30 38 25 52Z" fill="${hair}"/>`);
    if (style === 'crew') out.push(`<path d="M26 48 Q26 28 50 28 Q74 28 74 48 Q70 36 50 35 Q30 36 26 48Z" fill="${hair}"/>`);
    if (style === 'bangs') out.push(`<path d="M27 44 Q28 30 50 29 Q72 30 73 44 L67 41 L61 43.5 L55 41 L50 43.5 L45 41 L39 43.5 L33 41Z" fill="${hair}"/>`);
    if (style === 'bun') out.push(`<circle cx="50" cy="22" r="9" fill="${hair}"/>`);
    if (style === 'tuft') out.push(`<path d="M47 28 Q46 18 51 14 Q50 20 55 22 Q53 25 53 28Z" fill="${hair}"/>`);
    if (style === 'spiky') out.push(`<path d="M25 50 L28 30 L35 38 L40 24 L46 35 L52 22 L57 35 L63 25 L67 38 L73 30 L75 50 Q70 38 50 37 Q30 38 25 50Z" fill="${hair}"/>`);
    if (style === 'curly') for (const x of [34, 42, 50, 58, 66]) out.push(`<circle cx="${x}" cy="32" r="8" fill="${hair}"/>`);
    if (style === 'bald') out.push(`<path d="M26 54 Q25 46 29 44 L30 56Z M74 54 Q75 46 71 44 L70 56Z" fill="${hair}"/>`);
    if (style === 'bald') out.push(`<ellipse cx="42" cy="36" rx="7" ry="3" fill="#fff" opacity=".25"/>`);
  }
  if (p.headband) out.push(`<path d="M25 46 Q26 26 50 26 Q74 26 75 46" stroke="#33373d" stroke-width="4.5" fill="none"/>`);

  // face
  const brow = light ? '#8a8a8a' : hair;
  out.push(`<path d="M37 47 Q41 45 45 47 M55 47 Q59 45 63 47" stroke="${brow}" stroke-width="${kid ? 1.6 : 2.2}" fill="none" stroke-linecap="round"/>`);
  const er = kid ? 3.4 : 3;
  out.push(`<circle cx="41" cy="55" r="${er}" fill="${eye}"/><circle cx="59" cy="55" r="${er}" fill="${eye}"/>`);
  if (eye !== EYES.dark) out.push(`<circle cx="41" cy="55" r="1.4" fill="#1d1d1d"/><circle cx="59" cy="55" r="1.4" fill="#1d1d1d"/>`);
  out.push(`<circle cx="42" cy="54" r="1" fill="#fff"/><circle cx="60" cy="54" r="1" fill="#fff"/>`);
  out.push(`<path d="M50 58 Q47 64 50 65" stroke="rgba(0,0,0,.25)" stroke-width="1.6" fill="none" stroke-linecap="round"/>`);
  out.push(`<circle cx="36" cy="64" r="${kid ? 4.5 : 3.5}" fill="#e88" opacity="${kid ? 0.4 : 0.25}"/><circle cx="64" cy="64" r="${kid ? 4.5 : 3.5}" fill="#e88" opacity="${kid ? 0.4 : 0.25}"/>`);
  if (p.noseRing) out.push(`<circle cx="52.5" cy="64.5" r="1.6" fill="none" stroke="#c9c9c9" stroke-width="1"/>`);
  if (p.facial === 'mustache') out.push(`<path d="M41 68 Q50 63 59 68 Q50 67 41 68Z" fill="${hair}" stroke="${hair}" stroke-width="2"/>`);
  out.push(`<path d="M43 71 Q50 77 57 71" stroke="#8a3b3b" stroke-width="2.2" fill="none" stroke-linecap="round"/>`);

  if (p.glasses) {
    const gc = p.glassesColor || '#222';
    const lens = p.glasses === 'sun' ? 'rgba(30,30,35,.85)' : 'rgba(255,255,255,.15)';
    out.push(`<g stroke="${gc}" stroke-width="2.2" fill="${lens}"><rect x="33" y="49" width="15" height="12" rx="5"/><rect x="52" y="49" width="15" height="12" rx="5"/><path d="M48 55 L52 55 M33 53 L27 52 M67 53 L73 52" fill="none"/></g>`);
  }
  if (p.earrings) out.push(`<circle cx="26" cy="66" r="2.6" fill="#f2c230"/><circle cx="74" cy="66" r="2.6" fill="#f2c230"/>`);

  // hats (hair peeks out at the sides under a cap or beanie)
  const hc = p.hatColor;
  if ((p.hat === 'cap' || p.hat === 'beanie') && style !== 'bald') out.push(`<path d="M25 44 Q23 54 26 60 L30 46Z M75 44 Q77 54 74 60 L70 46Z" fill="${hair}"/>`);
  if (p.hat === 'cap') out.push(`<path d="M24 46 Q24 22 50 22 Q76 22 76 46 Z" fill="${hc || '#d23c3c'}"/><path d="M50 42 L88 42 Q90 47 84 48 L50 48Z" fill="${hc || '#a82c2c'}" style="filter:brightness(.8)"/>`);
  if (p.hat === 'beanie') out.push(`<path d="M24 46 Q24 18 50 18 Q76 18 76 46 Z" fill="${hc || '#3d8fb0'}"/><rect x="22" y="40" width="56" height="9" rx="4" fill="#2c6f8a"/><circle cx="50" cy="16" r="6" fill="#f3f3f3"/>`);
  if (p.hat === 'fedora') out.push(`<ellipse cx="50" cy="36" rx="36" ry="6" fill="#4a3b2f"/><path d="M32 36 Q32 14 50 14 Q68 14 68 36Z" fill="#5c4a3a"/><rect x="32" y="29" width="36" height="5" fill="#2d241c"/>`);

  return `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${out.join('')}</svg>`;
}
