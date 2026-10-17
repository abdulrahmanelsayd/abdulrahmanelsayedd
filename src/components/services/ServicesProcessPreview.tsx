export function ServiceProcessPreview({ index }: { index: number }) {
  return <svg viewBox="0 0 520 360" fill="none" aria-hidden="true" focusable="false">
    <g data-services-process-piece>
      <rect x="40" y="50" width="420" height="260" rx="18" fill="#fff" stroke="#d2d2d7" strokeWidth="2" />
      <path d="M41 94h418" stroke="#e5e5ea" strokeWidth="2" />
      <circle cx="62" cy="72" r="3" fill="#b2b2b8" /><circle cx="75" cy="72" r="3" fill="#b2b2b8" /><circle cx="88" cy="72" r="3" fill="#b2b2b8" />
      <rect x="166" y="64" width="168" height="16" rx="8" fill="#f5f5f7" />
    </g>
    {index === 0 ? <>
      <g data-services-process-piece>
        <path d="M92 148a18 18 0 0 1 18-18h194a18 18 0 0 1 18 18v68a18 18 0 0 1-18 18H151l-29 22v-22h-12a18 18 0 0 1-18-18Z" fill="#f5f5f7" />
        <path d="M116 158h136M116 180h170M116 202h96" stroke="#b2b2b8" strokeWidth="7" strokeLinecap="round" />
      </g>
      <g data-services-process-piece>
        <path d="M270 199a18 18 0 0 1 18-18h106a18 18 0 0 1 18 18v47a18 18 0 0 1-18 18h-13v18l-25-18h-68a18 18 0 0 1-18-18Z" fill="#a1ff62" />
        <circle cx="313" cy="220" r="5" fill="#1d1d1f" /><circle cx="367" cy="220" r="5" fill="#1d1d1f" /><path d="M325 239q15 14 30 0" stroke="#1d1d1f" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </> : index === 1 ? <g data-services-process-piece stroke="#d2d2d7" strokeWidth="2">
      <rect x="62" y="114" width="110" height="14" rx="7" fill="#f5f5f7" stroke="none" /><path d="M339 121h26M381 121h26M421 121h17" strokeLinecap="round" />
      <rect x="62" y="148" width="230" height="86" rx="10" fill="#f5f5f7" /><rect x="312" y="148" width="126" height="138" rx="10" fill="#f0befa" stroke="none" />
      <rect x="62" y="252" width="106" height="34" rx="8" /><rect x="186" y="252" width="106" height="34" rx="8" />
      <path d="M82 169h116M82 186h177M82 203h151" strokeLinecap="round" />
      <path d="M341 190h68M375 166v48" stroke="#9951ac" strokeLinecap="round" />
    </g> : <>
      <g data-services-process-piece>
        <rect x="62" y="114" width="67" height="11" rx="5.5" fill="#1d1d1f" /><path d="M339 120h26M381 120h26M421 120h17" stroke="#b2b2b8" strokeWidth="3" strokeLinecap="round" />
        <rect x="62" y="143" width="376" height="88" rx="10" fill="#f5f5f7" />
        <path d="M82 166h125M82 181h99" stroke="#1d1d1f" strokeWidth="7" strokeLinecap="round" />
        <rect x="79" y="201" width="70" height="13" rx="6.5" fill="#82a0ff" />
        <path d="m349 153 10 20 22-7-7 22 20 10-22 8 7 22-22-8-10 20-8-22-22 7 8-22-20-10 22-8-7-22 22 8Z" fill="#f0befa" />
        {[62, 192, 322].map(x => <g key={x}><rect x={x} y="247" width="116" height="40" rx="8" fill="#f5f5f7" /><path d={`M${x + 15} 262h57M${x + 15} 275h35`} stroke="#b2b2b8" strokeWidth="3" strokeLinecap="round" /></g>)}
      </g>
      {index === 2 && <g data-services-process-piece stroke="#4262b3" strokeWidth="1.5">
        <rect x="58" y="139" width="384" height="96" rx="2" />
        {[[58, 139], [442, 139], [58, 235], [442, 235]].map(([x, y]) => <rect key={`${x}-${y}`} x={x - 3} y={y - 3} width="6" height="6" fill="#fff" />)}
      </g>}
      {index === 3 && <g data-services-process-piece>
        <rect x="323" y="160" width="156" height="124" rx="16" fill="#fff" stroke="#d2d2d7" strokeWidth="2" />
        {[187, 222, 257].map(y => <g key={y}><circle cx="347" cy={y} r="10" fill="#a1ff62" /><path d={`m342 ${y} 4 4 6-7`} stroke="#1d1d1f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d={`M369 ${y}h83`} stroke="#b2b2b8" strokeWidth="4" strokeLinecap="round" /></g>)}
      </g>}
      {index === 4 && <g data-services-process-piece>
        <circle cx="448" cy="68" r="32" fill="#a1ff62" /><path d="M436 80l24-24M439 56h21v21" stroke="#1d1d1f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>}
    </>}
  </svg>;
}

