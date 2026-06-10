// Logo Praxis (module Spektalis). Style maison : carre ink + glyphe ambre.
// Glyphe : un hub central relie a trois noeuds = le pool d'equipes / competences.
export default function PraxisLogo({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Praxis"
    >
      <rect width="64" height="64" rx="14" fill="#0B1220" />
      <line x1="32" y1="32" x2="32" y2="16" stroke="#E89B2C" strokeWidth="1.8" />
      <line x1="32" y1="32" x2="17" y2="46" stroke="#E89B2C" strokeWidth="1.8" />
      <line x1="32" y1="32" x2="47" y2="46" stroke="#E89B2C" strokeWidth="1.8" />
      <circle cx="32" cy="16" r="4.5" fill="#E89B2C" />
      <circle cx="17" cy="46" r="4.5" fill="#E89B2C" />
      <circle cx="47" cy="46" r="4.5" fill="#E89B2C" />
      <circle cx="32" cy="32" r="6.5" fill="#E89B2C" />
      <circle cx="32" cy="32" r="2.6" fill="#0B1220" />
    </svg>
  );
}
