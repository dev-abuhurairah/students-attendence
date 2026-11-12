import React from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onBack }) => {
  return (
    <header className="safe-top sticky top-0 z-20 bg-[#F8FAFF]/95 px-4 pb-3 backdrop-blur-sm">
      <div className="mx-auto grid max-w-[560px] grid-cols-[72px_1fr_72px] items-center gap-2">
        <div className="flex justify-start">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex h-9 items-center justify-center rounded-full bg-[#6495ED]/20 px-3.5 text-xs font-semibold text-[#002B5B] active:opacity-75"
            >
              Back
            </button>
          )}
        </div>

        <div className="min-w-0 text-center">
          <h1 className="truncate text-lg font-semibold leading-tight tracking-tight text-[#002B5B]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs font-medium leading-tight text-[#002B5B]/65">
              {subtitle}
            </p>
          )}
        </div>

        <div />
      </div>
    </header>
  );
};
