/* Card art for the flag quizzes: a few of the region's flags, scattered. */

const SPOTS = [
  { x: 8, y: 16, r: -8 },
  { x: 38, y: 8, r: 4 },
  { x: 68, y: 18, r: -3 },
  { x: 20, y: 54, r: 6 },
  { x: 52, y: 50, r: -6 },
  { x: 80, y: 58, r: 5 },
];

export function FlagArt({ srcs }: { srcs: string[] }) {
  return (
    <div className="flag-art" aria-hidden="true">
      {srcs.slice(0, SPOTS.length).map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          style={{ left: `${SPOTS[i].x}%`, top: `${SPOTS[i].y}%`, transform: `translate(-30%, 0) rotate(${SPOTS[i].r}deg)` }}
        />
      ))}
    </div>
  );
}
