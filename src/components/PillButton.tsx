import React from 'react';

interface PillButtonProps {
  label: string;
  onClick: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

/**
 * Primary action pill button matching exact minimalistic design specifications:
 * - 90% screen width, centered horizontally
 * - 110px height, fully rounded pill corners (50% border radius)
 * - Soft periwinkle blue (#6495ED) background, dark navy blue (#002B5B) text
 * - 28-30px medium (500) sans-serif typography, centered H & V
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
      className="mx-auto flex h-[110px] w-[90%] max-w-[540px] cursor-pointer items-center justify-center rounded-full bg-[#6495ED] px-6 text-center text-[28px] font-medium leading-tight text-[#002B5B] transition-opacity duration-150 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 sm:text-[30px]"
    >
      <span className="line-clamp-2 w-full text-center">{label}</span>
    </button>
  );
};
