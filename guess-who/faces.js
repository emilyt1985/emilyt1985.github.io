// Draws a cartoon placeholder face from a person's traits (SVG string).

const SKIN = ['#f6d7c3', '#eebd9a', '#d9a27a', '#b97d55', '#8d5a3b', '#5e3b26'];
const HAIR = { black: '#231b17', brown: '#6b4226', blonde: '#e6c15a', red: '#b8451f', gray: '#a9a9a9' };
const SHIRT = { red: '#e05a4f', blue: '#4a7fd6', green: '#4caf6e', yellow: '#efbd33', purple: '#8b5fc7', teal: '#2aa5a0' };
const BG = ['#fde9d9', '#e3f0fb', '#e8f6e9', '#fbf3d5', '#efe6fa', '#ddf3f1', '#fbe3ea'];

function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }

export function faceSVG(p) {
  const skin = SKIN[p.skin ?? 1] || SKIN[1];
  const hair = HAIR[p.hair] || HAIR.brown;
  const shirt = SHIRT[p.shirt] || SHIRT.blue;
  const bg = BG[hash(p.name || '') % BG.length];
  const style = p.style || 'short';
  const out = [];

  out.push(`<rect width="100" height="120" fill="${bg}"/>`);

  // hair behind the head
  if (style === 'long') out.push(`<path d="M23 52 Q18 98 30 110 L70 110 Q82 98 77 52 Z" fill="${hair}"/>`);
  if (style === 'bob') out.push(`<path d="M23 50 Q20 80 28 84 L72 84 Q80 80 77 50 Z" fill="${hair}"/>`);
  if (style === 'curly') {
    for (const [x, y] of [[26, 46], [24, 60], [27, 74], [74, 46], [76, 60], [73, 74], [32, 34], [68, 34]])
      out.push(`<circle cx="${x}" cy="${y}" r="9" fill="${hair}"/>`);
  }

  // body, neck, ears, head
  out.push(`<path d="M12 120 Q16 92 50 90 Q84 92 88 120 Z" fill="${shirt}"/>`);
  out.push(`<rect x="43" y="76" width="14" height="16" rx="4" fill="${skin}"/>`);
  out.push(`<circle cx="26" cy="58" r="5" fill="${skin}"/><circle cx="74" cy="58" r="5" fill="${skin}"/>`);
  out.push(`<ellipse cx="50" cy="56" rx="24" ry="27" fill="${skin}"/>`);

  // beard sits under facial features
  if (p.facial === 'beard') out.push(`<path d="M26 56 Q27 88 50 88 Q73 88 74 56 Q70 74 50 75 Q30 74 26 56Z" fill="${hair}"/>`);

  // hair on top
  if (!p.hat || p.hat === 'fedora') {
    if (style === 'short' || style === 'long' || style === 'bob' || style === 'bun')
      out.push(`<path d="M25 52 Q24 26 50 26 Q76 26 75 52 Q72 38 50 37 Q30 38 25 52Z" fill="${hair}"/>`);
    if (style === 'bun') out.push(`<circle cx="50" cy="22" r="9" fill="${hair}"/>`);
    if (style === 'spiky') out.push(`<path d="M25 50 L28 30 L35 38 L40 24 L46 35 L52 22 L57 35 L63 25 L67 38 L73 30 L75 50 Q70 38 50 37 Q30 38 25 50Z" fill="${hair}"/>`);
    if (style === 'curly') for (const x of [34, 42, 50, 58, 66]) out.push(`<circle cx="${x}" cy="32" r="8" fill="${hair}"/>`);
    if (style === 'bald') out.push(`<path d="M26 54 Q25 46 29 44 L30 56Z M74 54 Q75 46 71 44 L70 56Z" fill="${hair}"/>`);
  }

  // face
  out.push(`<path d="M37 47 Q41 45 45 47 M55 47 Q59 45 63 47" stroke="${hair === HAIR.gray ? '#777' : hair}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`);
  out.push(`<circle cx="41" cy="55" r="3" fill="#2b2b2b"/><circle cx="59" cy="55" r="3" fill="#2b2b2b"/>`);
  out.push(`<circle cx="42" cy="54" r="1" fill="#fff"/><circle cx="60" cy="54" r="1" fill="#fff"/>`);
  out.push(`<path d="M50 58 Q47 64 50 65" stroke="rgba(0,0,0,.25)" stroke-width="1.6" fill="none" stroke-linecap="round"/>`);
  out.push(`<circle cx="36" cy="64" r="3.5" fill="#e88" opacity=".25"/><circle cx="64" cy="64" r="3.5" fill="#e88" opacity=".25"/>`);
  if (p.facial === 'mustache') out.push(`<path d="M41 68 Q50 63 59 68 Q50 67 41 68Z" fill="${hair}" stroke="${hair}" stroke-width="2"/>`);
  out.push(`<path d="M43 71 Q50 77 57 71" stroke="#8a3b3b" stroke-width="2.2" fill="none" stroke-linecap="round"/>`);

  if (p.glasses) out.push(`<g stroke="#222" stroke-width="2" fill="rgba(255,255,255,.15)"><circle cx="41" cy="55" r="7"/><circle cx="59" cy="55" r="7"/><path d="M48 55 L52 55 M34 54 L27 52 M66 54 L73 52" fill="none"/></g>`);
  if (p.earrings) out.push(`<circle cx="26" cy="66" r="2.6" fill="#f2c230"/><circle cx="74" cy="66" r="2.6" fill="#f2c230"/>`);

  // hats
  if (p.hat === 'cap') out.push(`<path d="M24 46 Q24 22 50 22 Q76 22 76 46 Z" fill="#d23c3c"/><path d="M50 42 L88 42 Q90 47 84 48 L50 48Z" fill="#a82c2c"/>`);
  if (p.hat === 'beanie') out.push(`<path d="M24 46 Q24 18 50 18 Q76 18 76 46 Z" fill="#3d8fb0"/><rect x="22" y="40" width="56" height="9" rx="4" fill="#2c6f8a"/><circle cx="50" cy="16" r="6" fill="#f3f3f3"/>`);
  if (p.hat === 'fedora') out.push(`<ellipse cx="50" cy="36" rx="36" ry="6" fill="#4a3b2f"/><path d="M32 36 Q32 14 50 14 Q68 14 68 36Z" fill="#5c4a3a"/><rect x="32" y="29" width="36" height="5" fill="#2d241c"/>`);

  return `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${out.join('')}</svg>`;
}
