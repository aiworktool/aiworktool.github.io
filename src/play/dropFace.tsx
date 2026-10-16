export function BallFace({ tier }: { tier: number }) {
  const kind = tierKind(tier);
  return (
    <svg className="drop-face" viewBox="0 0 64 64" aria-hidden="true">
      {kind === 0 && <Smile />}
      {kind === 1 && <Wide />}
      {kind === 2 && <Wink />}
      {kind === 3 && <Surprise />}
      {kind === 4 && <Sleepy />}
      {kind === 5 && <Grin />}
      {kind === 6 && <Smirk />}
      {kind === 7 && <Happy />}
      {kind === 8 && <Calm />}
      {kind === 9 && <Tongue />}
      {kind === 10 && <Spark />}
    </svg>
  );
}

function tierKind(tier: number): number {
  if (!Number.isFinite(tier) || tier < 0) return 0;
  if (tier > 10) return 10;
  return Math.floor(tier);
}

function Smile() {
  return (
    <>
      <Eye x={24} />
      <Eye x={42} />
      <path d="M26 42c3 4 9 4 12 0" fill="none" stroke="#1c1915" strokeWidth="2.2" strokeLinecap="round" />
    </>
  );
}

function Wide() {
  return (
    <>
      <Eye x={23} r={4.2} />
      <Eye x={43} r={4.2} />
      <path d="M24 40c4 7 12 7 16 0" fill="none" stroke="#1c1915" strokeWidth="2.4" strokeLinecap="round" />
    </>
  );
}

function Wink() {
  return (
    <>
      <Eye x={24} />
      <path d="M36 29h12" stroke="#1c1915" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M26 42c3 3 9 3 12 0" fill="none" stroke="#1c1915" strokeWidth="2.2" strokeLinecap="round" />
    </>
  );
}

function Surprise() {
  return (
    <>
      <Eye x={24} r={3.4} />
      <Eye x={42} r={3.4} />
      <circle cx="33" cy="44" r="4" fill="none" stroke="#1c1915" strokeWidth="2.2" />
    </>
  );
}

function Sleepy() {
  return (
    <>
      <path d="M19 30h10" stroke="#1c1915" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M37 30h10" stroke="#1c1915" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M28 43h8" stroke="#1c1915" strokeWidth="2.2" strokeLinecap="round" />
    </>
  );
}

function Grin() {
  return (
    <>
      <Eye x={24} />
      <Eye x={42} />
      <path d="M24 40c3 8 13 8 16 0" fill="#fffdf8" stroke="#1c1915" strokeWidth="2.2" />
    </>
  );
}

function Smirk() {
  return (
    <>
      <Eye x={24} r={2.6} />
      <Eye x={43} r={2.6} />
      <path d="M26 43c4 2 10 3 14-1" fill="none" stroke="#1c1915" strokeWidth="2.2" strokeLinecap="round" />
    </>
  );
}

function Happy() {
  return (
    <>
      <path d="M19 31c2-4 8-4 10 0" fill="none" stroke="#1c1915" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M35 31c2-4 8-4 10 0" fill="none" stroke="#1c1915" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M24 42c3 5 13 5 16 0" fill="none" stroke="#1c1915" strokeWidth="2.2" strokeLinecap="round" />
    </>
  );
}

function Calm() {
  return (
    <>
      <Eye x={25} r={2.2} />
      <Eye x={41} r={2.2} />
      <path d="M27 43h10" stroke="#1c1915" strokeWidth="2.2" strokeLinecap="round" />
    </>
  );
}

function Tongue() {
  return (
    <>
      <Eye x={24} />
      <Eye x={42} />
      <path d="M25 40c3 5 11 5 14 0" fill="none" stroke="#1c1915" strokeWidth="2.2" />
      <path d="M30 43c1 6 4 6 5 0" fill="#e07a8a" stroke="#1c1915" strokeWidth="1.6" />
    </>
  );
}

function Spark() {
  return (
    <>
      <path d="M24 24l1.4 4 4 1.4-4 1.4-1.4 4-1.4-4-4-1.4 4-1.4z" fill="#1c1915" />
      <path d="M44 24l1.4 4 4 1.4-4 1.4-1.4 4-1.4-4-4-1.4 4-1.4z" fill="#1c1915" />
      <path d="M23 42c4 6 14 6 18 0" fill="none" stroke="#1c1915" strokeWidth="2.4" strokeLinecap="round" />
    </>
  );
}

function Eye({ x, r = 3 }: { x: number; r?: number }) {
  return (
    <>
      <circle cx={x} cy="29" r={r + 1.6} fill="#fffdf8" />
      <circle cx={x + 0.6} cy="30" r={r * 0.55} fill="#1c1915" />
    </>
  );
}
