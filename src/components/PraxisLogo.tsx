// Logo Praxis (module Suite Spektalis). Style maison : carre ink + glyphe trait
// dans la couleur du module (cuivre #D97706). Glyphe : un personnage (le technicien).
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
      <rect width="64" height="64" rx="10" fill="#0B1220" />
      {/* tete */}
      <circle cx="32" cy="23" r="8" fill="#D97706" />
      {/* epaules / buste */}
      <path
        d="M15 51 C15 40 22.5 34.5 32 34.5 C41.5 34.5 49 40 49 51"
        stroke="#D97706"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
