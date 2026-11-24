const jitter = (index: number) => {
  const value = Math.sin(index + 1) * 10_000;
  return value - Math.floor(value);
};

/**
 * The hairline field from the reference login, drawn with CSS instead of a
 * motion library: 36 paths animating a normalised dash offset never touch JS.
 */
export default function LoginPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, index) => {
    const x = 380 - index * 5 * position;
    const y = 189 + index * 6;
    return {
      id: index,
      d: `M-${x} -${y}C-${x} -${y} -${312 - index * 5 * position} ${216 - index * 6} ${
        152 - index * 5 * position
      } ${343 - index * 6}C${616 - index * 5 * position} ${470 - index * 6} ${
        684 - index * 5 * position
      } ${875 - index * 6} ${684 - index * 5 * position} ${875 - index * 6}`,
      width: 0.5 + index * 0.03,
      duration: 20 + jitter(index) * 10,
      delay: -jitter(index + 7) * 22,
    };
  });

  return (
    <svg
      className="login-paths"
      viewBox="0 0 696 316"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
    >
      {paths.map((path) => (
        <path
          key={path.id}
          d={path.d}
          stroke="currentColor"
          strokeWidth={path.width}
          vectorEffect="non-scaling-stroke"
          strokeOpacity={0.08 + path.id * 0.005}
          pathLength={1}
          strokeDasharray={1}
          style={
            {
              '--dur': `${path.duration}s`,
              '--delay': `${path.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </svg>
  );
}
