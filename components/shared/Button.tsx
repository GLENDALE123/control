import React from 'react';

interface BaseButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

interface ButtonProps extends BaseButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost';
}

const baseButtonClasses = "inline-flex items-center justify-center font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

const sizeClasses = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base"
};

const variantClasses = {
  primary: "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500",
  secondary: "bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-slate-500 focus:ring-gray-500",
  danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
  warning: "bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500",
  ghost: "bg-transparent text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 focus:ring-gray-500"
};

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  type = 'button',
  disabled = false,
  className = "",
  size = 'md',
  variant = 'primary'
}) => {
  const classes = [
    baseButtonClasses,
    sizeClasses[size],
    variantClasses[variant],
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {children}
    </button>
  );
};

// 특수 버튼들
export const PrimaryButton: React.FC<BaseButtonProps> = (props) => (
  <Button {...props} variant="primary" />
);

export const SecondaryButton: React.FC<BaseButtonProps> = (props) => (
  <Button {...props} variant="secondary" />
);

export const DangerButton: React.FC<BaseButtonProps> = (props) => (
  <Button {...props} variant="danger" />
);

export const SuccessButton: React.FC<BaseButtonProps> = (props) => (
  <Button {...props} variant="success" />
);

export const WarningButton: React.FC<BaseButtonProps> = (props) => (
  <Button {...props} variant="warning" />
);

export const GhostButton: React.FC<BaseButtonProps> = (props) => (
  <Button {...props} variant="ghost" />
);

// 아이콘 버튼
interface IconButtonProps extends BaseButtonProps {
  icon: React.ReactNode;
  label?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  className = "",
  ...props
}) => {
  const classes = [
    "inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      {...props}
      className={classes}
      aria-label={label}
    >
      {icon}
    </button>
  );
};

// 버튼 그룹
interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  className = ""
}) => (
  <div className={`flex gap-2 ${className}`}>
    {children}
  </div>
);
