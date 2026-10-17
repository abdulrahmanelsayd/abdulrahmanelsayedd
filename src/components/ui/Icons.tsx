export function Arrow({ size = 32 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
    <path d="M7 25 25 7M7 7h18v18" stroke="currentColor" strokeWidth="1.5" />
  </svg>;
}
export function MailIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.6" />
    <path d="m4 6 8 7 8-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
export function PhoneIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path d="m8.5 3 2 5-2.7 2.2a15 15 0 0 0 6 6L16 13.5l5 2v2a3.5 3.5 0 0 1-3.8 3.5A17 17 0 0 1 3 6.8 3.5 3.5 0 0 1 6.5 3h2Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
export function SocialIcon({ name, menu = false }: { name: "Instagram" | "Tumblr"; menu?: boolean }) {
  if (menu) return name === "Instagram"
    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" /></svg>
    : <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M14 3v5h5v4h-5v5c0 2 1 3 4 2v4c-6 2-9-1-9-6v-5H6V8c3-1 4-2 4-5z" /></svg>;
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    {name === "Instagram" ? <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17.3" cy="6.8" r="1.1" fill="currentColor" />
    </> : <path d="M9 3h4v5h4v4h-4v5c0 1.1.5 1.6 1.5 1.6.8 0 1.6-.2 2.5-.6v3.7c-1 .5-2.2.8-3.5.8C10 22.5 8 20.6 8 17.3V12H5V8c2.5-.8 3.7-2.4 4-5Z" fill="currentColor" />}
  </svg>;
}
