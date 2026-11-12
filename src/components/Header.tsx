import React from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onBack }) => {
  return (
    <header className="safe-top sticky top-0 z-20 bg-[#F8FAFF]/95 px-5 pb-4 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[600px] items-center justify-between gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 items-center justify-center rounded-full bg-[#6495ED]/20 px-4 text-sm font-medium text-[#002B5B] active:opacity-75"
          >
            Back
          </button>
        ) : (
          <div className="w-14" />
        )}

        <div className="flex-1 text-center">
          <h1 className="truncate text-xl font-semibold tracking-tight text-[#002B5B]">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-xs font-medium text-[#002B5B]/65">
              {subtitle}
            </p>
          )}
        </div>

        <div className="w-14" />
      </div>
    </header>
  );
};
