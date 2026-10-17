/** Original flat graphics. All service information lives in the adjacent HTML. */
export function ServiceStudioArt({ mode }: { mode: "design" | "develop" | "together" }) {
  return <svg viewBox="0 0 480 350" fill="none" aria-hidden="true" focusable="false">
    {mode === "design" ? <>
      <path d="m240 13 35 109 105-57-58 104 109 35-109 35 58 104-105-57-35 109-35-109-105 57 58-104-109-35 109-35-58-104 105 57Z" fill="#f0befa" transform="translate(38 -4) scale(.84)" />
      <g data-services-eye><ellipse cx="199" cy="158" rx="20" ry="29" fill="#161313" /><ellipse cx="281" cy="158" rx="20" ry="29" fill="#161313" /><g data-services-pupil><circle cx="204" cy="149" r="7" fill="#f0befa" /><circle cx="286" cy="149" r="7" fill="#f0befa" /></g></g>
      <path d="M206 220q34 30 68 0" stroke="#161313" strokeWidth="4" strokeLinecap="round" />
      <path d="M45 71h27M58 57v28M402 261h28M416 247v28" stroke="#161313" strokeWidth="3" strokeLinecap="round" />
    </> : mode === "develop" ? <>
      <g data-services-pair="look"><rect x="38" y="89" width="244" height="160" rx="80" stroke="#161313" strokeWidth="32" /><path d="m129 137-24 33 24 33M171 137l24 33-24 33" stroke="#4262b3" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></g>
      <g data-services-pair="logic"><rect x="196" y="44" width="244" height="160" rx="80" stroke="#82a0ff" strokeWidth="32" /><path d="m283 126 19 19 33-39" stroke="#161313" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></g>
      <path d="M282 169a80 80 0 0 1-80 80" stroke="#161313" strokeWidth="32" />
      <path d="M84 282v24M72 294h24M398 259v24M386 271h24" stroke="#161313" strokeWidth="3" strokeLinecap="round" />
    </> : <>
      <g data-services-pair="look"><circle cx="163" cy="172" r="113" fill="#f0befa" /><g data-services-eye><ellipse cx="118" cy="159" rx="17" ry="23" fill="#161313" /><ellipse cx="174" cy="159" rx="17" ry="23" fill="#161313" /><g data-services-pupil><circle cx="122" cy="153" r="5.5" fill="#f0ebe6" /><circle cx="178" cy="153" r="5.5" fill="#f0ebe6" /></g></g><path d="M124 204q22 22 44 0" stroke="#161313" strokeWidth="3.5" strokeLinecap="round" /></g>
      <g data-services-pair="logic"><rect x="223" y="59" width="206" height="226" rx="103" fill="#82a0ff" /><path d="m303 137-23 35 23 35M358 137l23 35-23 35M339 126l-18 92" stroke="#161313" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></g>
      <path d="M236 151v44M214 173h44" stroke="#161313" strokeWidth="5" strokeLinecap="round" />
      <path d="M81 306c89 35 227 28 318-5" stroke="#161313" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 8" />
    </>}
  </svg>;
}

