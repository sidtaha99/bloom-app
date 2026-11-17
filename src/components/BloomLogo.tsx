interface BloomLogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

export function BloomLogo({ size = 28, showWordmark = true, className = '' }: BloomLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 select-none whitespace-nowrap shrink-0 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Soft botanical 5-petal bloom emblem */}
        <path
          d="M18 4.5C20.8 4.5 22.8 8.2 21.6 12.6C20.9 15 19.3 16.5 18 16.5C16.7 16.5 15.1 15 14.4 12.6C13.2 8.2 15.2 4.5 18 4.5Z"
          fill="#C97B8E"
          fillOpacity="0.9"
        />
        <path
          d="M30.8 13.8C31.7 16.5 28.8 19.6 24.3 19.8C21.8 19.9 19.8 18.8 19.4 17.5C19 16.3 20 14.3 22 12.8C25.8 10 29.9 11.1 30.8 13.8Z"
          fill="#D9A3B1"
          fillOpacity="0.9"
        />
        <path
          d="M25.9 28.9C23.6 30.6 19.8 28.8 18.3 24.5C17.5 22.1 17.9 19.9 18.9 19.1C19.9 18.4 22.1 18.7 24.1 20.1C27.9 22.8 28.2 27.2 25.9 28.9Z"
          fill="#9E8BB8"
          fillOpacity="0.88"
        />
        <path
          d="M10.1 28.9C7.8 27.2 8.1 22.8 11.9 20.1C13.9 18.7 16.1 18.4 17.1 19.1C18.1 19.9 18.5 22.1 17.7 24.5C16.2 28.8 12.4 30.6 10.1 28.9Z"
          fill="#789683"
          fillOpacity="0.85"
        />
        <path
          d="M5.2 13.8C6.1 11.1 10.2 10 14 12.8C16 14.3 17 16.3 16.6 17.5C16.2 18.8 14.2 19.9 11.7 19.8C7.2 19.6 4.3 16.5 5.2 13.8Z"
          fill="#B6687C"
          fillOpacity="0.88"
        />
        <circle cx="18" cy="18" r="3.2" fill="#FAF8F6" stroke="#9D4E63" strokeWidth="1.4" />
      </svg>
      {showWordmark && (
        <span className="font-display text-xl font-semibold tracking-tight text-[#2B2328] dark:text-[#F4EEF2]">
          Bloom
        </span>
      )}
    </span>
  );
}
