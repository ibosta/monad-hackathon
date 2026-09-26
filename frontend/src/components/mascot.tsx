import { cn } from "@/lib/utils";

export type MascotMood = "happy" | "cheer" | "sad" | "think";

/** Mona, the Moningo bird: a round metallic-violet Monad bird. Pure SVG. */
export function Mascot({
  mood = "happy",
  size = 160,
  className,
  float = true,
}: {
  mood?: MascotMood;
  size?: number;
  className?: string;
  float?: boolean;
}) {
  const wingsUp = mood === "cheer";
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={cn(
        float && "animate-float",
        "drop-shadow-[0_18px_30px_rgba(131,110,249,0.45)]",
        className
      )}
      role="img"
      aria-label={`Mona the Moningo bird (${mood})`}
    >
      <defs>
        <radialGradient id="mona-body" cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#E6E1FE" />
          <stop offset="28%" stopColor="#9D8CFB" />
          <stop offset="62%" stopColor="#836EF9" />
          <stop offset="100%" stopColor="#3B2A8F" />
        </radialGradient>
        <linearGradient id="mona-belly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FBFAF9" />
          <stop offset="100%" stopColor="#DDD7FE" />
        </linearGradient>
        <linearGradient id="mona-wing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6A52E8" />
          <stop offset="100%" stopColor="#200052" />
        </linearGradient>
        <linearGradient id="mona-beak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFB547" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
        <linearGradient id="mona-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* feet */}
      <g fill="#F97316">
        <rect x="74" y="168" width="14" height="18" rx="6" />
        <rect x="112" y="168" width="14" height="18" rx="6" />
      </g>

      {/* wings */}
      <g fill="url(#mona-wing)" className={wingsUp ? "mona-flap" : "mona-idle-wing"}>
        <path
          d={
            wingsUp
              ? "M40 98 C10 70 12 40 26 34 C40 60 52 76 58 96 Z"
              : "M38 104 C18 118 20 146 36 150 C44 132 52 120 58 108 Z"
          }
        />
        <path
          d={
            wingsUp
              ? "M160 98 C190 70 188 40 174 34 C160 60 148 76 142 96 Z"
              : "M162 104 C182 118 180 146 164 150 C156 132 148 120 142 108 Z"
          }
        />
      </g>

      {/* head tuft: a little Monad diamond */}
      <path d="M100 14 L112 30 L100 46 L88 30 Z" fill="#A0055D" />
      <path d="M100 20 L107 30 L100 40 L93 30 Z" fill="#E6E1FE" opacity="0.7" />

      {/* body */}
      <ellipse cx="100" cy="106" rx="64" ry="70" fill="url(#mona-body)" />
      <ellipse cx="100" cy="128" rx="40" ry="42" fill="url(#mona-belly)" />
      <ellipse
        cx="74"
        cy="62"
        rx="22"
        ry="12"
        fill="url(#mona-shine)"
        transform="rotate(-25 74 62)"
      />

      {/* eyes */}
      {mood === "sad" ? (
        <g stroke="#200052" strokeWidth="6" strokeLinecap="round" fill="none">
          <path d="M66 84 Q78 94 90 84" />
          <path d="M110 84 Q122 94 134 84" />
        </g>
      ) : (
        <g className="mona-blink">
          <circle cx="78" cy="84" r="17" fill="#fff" />
          <circle cx="122" cy="84" r="17" fill="#fff" />
          <circle
            cx={mood === "think" ? 84 : 80}
            cy={mood === "think" ? 78 : 86}
            r="9"
            fill="#200052"
          />
          <circle
            cx={mood === "think" ? 128 : 124}
            cy={mood === "think" ? 78 : 86}
            r="9"
            fill="#200052"
          />
          <circle
            cx={mood === "think" ? 87 : 83}
            cy={mood === "think" ? 75 : 83}
            r="3"
            fill="#fff"
          />
          <circle
            cx={mood === "think" ? 131 : 127}
            cy={mood === "think" ? 75 : 83}
            r="3"
            fill="#fff"
          />
        </g>
      )}

      {/* cheeks */}
      <circle cx="62" cy="106" r="7" fill="#C8177E" opacity="0.45" />
      <circle cx="138" cy="106" r="7" fill="#C8177E" opacity="0.45" />

      {/* beak */}
      {mood === "cheer" || mood === "happy" ? (
        <path
          d="M88 102 Q100 96 112 102 Q106 122 100 122 Q94 122 88 102 Z"
          fill="url(#mona-beak)"
        />
      ) : (
        <path d="M90 104 L110 104 L100 116 Z" fill="url(#mona-beak)" />
      )}
      {mood === "cheer" && (
        <path d="M92 108 Q100 116 108 108" stroke="#7D2A00" strokeWidth="2.5" fill="none" />
      )}
    </svg>
  );
}
