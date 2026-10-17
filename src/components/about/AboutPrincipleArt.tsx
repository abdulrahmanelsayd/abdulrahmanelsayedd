/** Original flat illustrations. All scenes share one stage and stay decorative. */
export function AboutPrincipleArt({ index }: { index: number }) {
  if (index === 0) return <svg aria-hidden="true" focusable="false" viewBox="0 0 360 260" fill="none">
    <circle cx="276" cy="72" r="37" fill="#a1ff62" />
    <g transform="translate(0 -10)">
    <path d="m169 19 24 62 62-24-24 62 62 24-62 24 24 62-62-24-24 62-24-62-62 24 24-62-62-24 62-24-24-62 62 24Z" fill="#f0befa" />
    <circle cx="169" cy="143" r="36" fill="#000" />
    <path d="m153 143 11 11 22-23" stroke="#f0befa" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <path d="M62 39v22M51 50h22M292 208v26M279 221h26" stroke="#f0ebe6" strokeWidth="3" strokeLinecap="round" />
  </svg>;
  if (index === 1) return <svg aria-hidden="true" focusable="false" viewBox="0 0 360 260" fill="none">
    <rect x="46" y="43" width="267" height="160" rx="28" fill="#82a0ff" />
    <rect x="63" y="60" width="233" height="126" rx="16" stroke="#000" strokeWidth="3" />
    <path d="M86 92h90M86 112h59" stroke="#000" strokeWidth="6" strokeLinecap="round" />
    <circle cx="263" cy="145" r="19" fill="#a1ff62" />
    <path d="m183 108 4 126 32-36 26 48 27-15-27-47 48-8Z" fill="#f5693c" stroke="#000" strokeWidth="4" strokeLinejoin="round" />
    <path d="m160 95-17-14M181 80l-4-20M201 86l10-18" stroke="#f0ebe6" strokeWidth="3" strokeLinecap="round" />
  </svg>;
  if (index === 2) return <svg aria-hidden="true" focusable="false" viewBox="0 0 360 260" fill="none">
    <rect x="49" y="46" width="263" height="166" rx="83" fill="#a1ff62" />
    <ellipse cx="137" cy="119" rx="39" ry="49" fill="#000" />
    <ellipse cx="223" cy="119" rx="39" ry="49" fill="#000" />
    <ellipse cx="147" cy="116" rx="15" ry="22" fill="#f0ebe6" />
    <ellipse cx="233" cy="116" rx="15" ry="22" fill="#f0ebe6" />
    <circle cx="151" cy="109" r="5" fill="#000" /><circle cx="237" cy="109" r="5" fill="#000" />
    <path d="M160 183q20 17 40 0" stroke="#000" strokeWidth="4" strokeLinecap="round" />
    <path d="M26 102V68q0-20 20-20h19M294 211h20q20 0 20-20v-33" stroke="#82a0ff" strokeWidth="4" strokeLinecap="round" />
    <circle cx="312" cy="48" r="8" fill="#f0befa" />
  </svg>;
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 360 260" fill="none">
    <rect x="49" y="76" width="169" height="111" rx="55.5" stroke="#f0befa" strokeWidth="28" />
    <rect x="146" y="76" width="169" height="111" rx="55.5" stroke="#82a0ff" strokeWidth="28" />
    <path d="M146 90h18a42 42 0 0 1 40 28" stroke="#f0befa" strokeWidth="28" />
    <circle cx="267" cy="46" r="18" fill="#a1ff62" /><circle cx="83" cy="222" r="9" fill="#f5693c" />
    <path d="M59 24v24M47 36h24M310 207v24M298 219h24" stroke="#f0ebe6" strokeWidth="3" strokeLinecap="round" />
  </svg>;
}

export function HelloHand() {
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 96 96" fill="none">
    <path d="M32 53V29a6 6 0 0 1 12 0v20-29a6 6 0 0 1 12 0v29-24a6 6 0 0 1 12 0v27-16a6 6 0 0 1 12 0v27c0 17-10 28-25 28-10 0-16-5-22-14L20 59a6 6 0 0 1 9-8l12 12" fill="#f0ebe6" stroke="#161313" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 22 15 15M10 36H4M80 17l5-7" stroke="#161313" strokeWidth="2.5" strokeLinecap="round" />
  </svg>;
}
