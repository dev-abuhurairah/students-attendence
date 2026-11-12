import React from 'react';

interface PillButtonProps {
  label: string;
  onClick: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

/**
 * Compact, minimalistic primary action pill button:
 * - ~88% screen width, centered horizontally
 * - 80px height, fully rounded pill corners
 * - Soft periwinkle blue (#6495ED) background, dark navy blue (#002B5B) text
 * - 22-24px medium (500) sans-serif typography, centered H & V
 * - Flat design: no icons, no borders, no shadows, no gradients
 */
export const PillButton: React.FC<PillButtonProps> = ({
  label,
  onClick,
  type = 'button',
  disabled = false,
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="mx-auto flex h-[80px] w-[88%] max-w-[460px] cursor-pointer items-center justify-center rounded-full bg-[#6495ED] px-6 text-center text-[22px] font-medium leading-snug tracking-tight text-[#002B5B] transition-opacity duration-150 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 sm:text-[24px]"
    >
      <span className="line-clamp-2 w-full text-center">{label}</span>
    </button>
  );
};
