import React from 'react';

export type NavTab = 'home' | 'setup' | 'programs' | 'reports' | 'overview';

interface FloatingNavBarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const FloatingNavBar: React.FC<FloatingNavBarProps> = ({
  currentTab,
  onSelectTab,
}) => {
  return (
    <div className="pointer-events-none fixed bottom-4 inset-x-3 z-40 mx-auto max-w-[500px]">
      <nav className="pointer-events-auto flex items-center justify-between gap-1.5 rounded-full border border-white/70 bg-white/95 px-3 py-2 shadow-xl shadow-[#002B5B]/15 backdrop-blur-md transition-all sm:px-4 sm:py-2.5">
        {/* Navigation Items */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => onSelectTab('home')}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95 ${
              currentTab === 'home'
                ? 'bg-[#002B5B] text-white shadow-sm'
                : 'text-[#002B5B]/75 hover:bg-[#F0F4FF]'
            }`}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className="hidden xs:inline">Home</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('setup')}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95 ${
              currentTab === 'setup'
                ? 'bg-[#002B5B] text-white shadow-sm'
                : 'text-[#002B5B]/75 hover:bg-[#F0F4FF]'
            }`}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>Setup</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('programs')}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95 ${
              currentTab === 'programs'
                ? 'bg-[#002B5B] text-white shadow-sm'
                : 'text-[#002B5B]/75 hover:bg-[#F0F4FF]'
            }`}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <span>Programs</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('reports')}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95 ${
              currentTab === 'reports'
                ? 'bg-[#002B5B] text-white shadow-sm'
                : 'text-[#002B5B]/75 hover:bg-[#F0F4FF]'
            }`}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span>Reports</span>
          </button>
        </div>

        {/* dev-abuhurairah Signature Badge */}
        <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#002B5B]/5 px-2.5 py-1 text-[11px] font-bold tracking-tight text-[#002B5B] border border-[#002B5B]/10">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>dev-abuhurairah</span>
        </div>
      </nav>
    </div>
  );
};
