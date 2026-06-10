export function Loader({ text = "Завантаження…" }: { text?: string }) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="relative mx-auto mb-3 h-10 w-10">
            <svg
              className="animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="uaGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6ca6fc" />
                  <stop offset="100%" stopColor="#ffd75e" />
                </linearGradient>
              </defs>
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="url(#uaGradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="60 12.8"
                fill="none"
              />
            </svg>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{text}</p>
        </div>
      </div>
    );
  }