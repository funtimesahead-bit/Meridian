/** Decorative pictures for the game and quiz cards. */

const DIM_DOTS: [number, number][] = [
  [42, 38], [70, 52], [96, 30], [118, 64], [150, 44], [204, 36], [232, 58],
  [258, 88], [286, 48], [60, 96], [132, 104], [220, 110], [300, 100], [24, 70],
  [188, 126], [270, 130], [100, 132],
];

const AMBER = "#f6b73c";
const DIM = "#3a4c62";

export function CardArt({ kind }: { kind: "dot" | "pin" | "rings" | "ring" | "borders" | "route" }) {
  return (
    <svg viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {kind !== "borders" && kind !== "route" &&
        DIM_DOTS.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.4" fill={DIM} />)}

      {kind === "dot" && (
        <>
          <circle cx="176" cy="78" r="22" fill={AMBER} opacity="0.08" />
          <circle cx="176" cy="78" r="13" fill={AMBER} opacity="0.16" />
          <circle cx="176" cy="78" r="5.5" fill={AMBER} />
        </>
      )}

      {kind === "pin" && (
        <>
          <path
            d="M96 122 C120 96 150 132 186 104 S250 92 262 118 S150 160 96 122 Z"
            fill="#2b3b4e"
          />
          <ellipse cx="176" cy="112" rx="10" ry="3.5" fill="#070a0e" opacity="0.6" />
          <path
            d="M176 110 C172 96 158 88 158 72 A18 18 0 1 1 194 72 C194 88 180 96 176 110 Z"
            fill={AMBER}
          />
          <circle cx="176" cy="72" r="6.5" fill="#111820" />
        </>
      )}

      {(kind === "rings" || kind === "ring") && (
        <>
          <circle cx="160" cy="80" r="62" fill={AMBER} opacity="0.07" />
          <circle cx="160" cy="80" r="62" fill="none" stroke={AMBER} strokeWidth="2" />
          <circle
            cx="160"
            cy="80"
            r="34"
            fill="none"
            stroke={AMBER}
            strokeWidth="1.2"
            strokeDasharray="4 4"
            opacity="0.6"
          />
          <circle cx="160" cy="80" r="4.5" fill="#e8edf2" />
          {kind === "rings" ? (
            [[120, 62], [196, 58], [204, 104], [138, 118], [176, 30]].map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="4.5" fill="#4ade80" />
            ))
          ) : (
            <>
              <circle cx="204" cy="104" r="15" fill="#4ade80" opacity="0.18" />
              <circle cx="204" cy="104" r="8" fill="#4ade80" />
              <circle cx="120" cy="62" r="3.5" fill="#8fa1b5" />
              <circle cx="176" cy="30" r="3" fill="#8fa1b5" />
            </>
          )}
        </>
      )}

      {kind === "route" && (
        <g stroke="#0b1016" strokeWidth="2" strokeLinejoin="round">
          <path d="M28 52 L84 36 L104 84 L60 112 L24 96 Z" fill={AMBER} />
          <path d="M84 36 L150 44 L140 92 L104 84 Z" fill="#2f9d5c" />
          <path d="M150 44 L214 34 L222 86 L140 92 Z" fill="#35475c" />
          <path d="M104 84 L140 92 L150 136 L92 140 L60 112 Z" fill="#35475c" />
          <path d="M140 92 L222 86 L232 130 L150 136 Z" fill="#2f9d5c" />
          <path d="M214 34 L282 44 L296 96 L222 86 Z" fill="#35475c" />
          <path d="M222 86 L296 96 L290 140 L232 130 Z" fill={AMBER} />
        </g>
      )}

      {kind === "borders" && (
        <g stroke="#0b1016" strokeWidth="2" strokeLinejoin="round">
          <path d="M40 40 L110 28 L128 76 L84 104 L36 88 Z" fill="#2f9d5c" />
          <path d="M110 28 L190 34 L176 86 L128 76 Z" fill="#35475c" />
          <path d="M190 34 L276 30 L290 84 L236 108 L176 86 Z" fill="#2f9d5c" />
          <path d="M84 104 L128 76 L176 86 L160 140 L98 146 Z" fill="#35475c" />
          <path d="M176 86 L236 108 L226 150 L160 140 Z" fill="#35475c" />
          <path d="M36 88 L84 104 L98 146 L48 138 Z" fill="#2f9d5c" />
        </g>
      )}
    </svg>
  );
}
