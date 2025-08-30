import React from 'react';

type ButtonVariant = 'primary' | 'neutral' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

const variantClassName: Record<ButtonVariant, string> = {
  primary: 'ik-btn--primary',
  neutral: 'ik-btn--neutral',
  danger: 'ik-btn--danger',
  ghost: 'ik-btn--ghost',
};

const sizeClassName: Record<ButtonSize, string> = {
  sm: 'ik-btn--sm',
  md: 'ik-btn--md',
  lg: 'ik-btn--lg',
};

export function Button({ variant = 'primary', size = 'md', leftIcon, rightIcon, className, children, ...rest }: ButtonProps) {
  const classes = ['ik-btn', variantClassName[variant], sizeClassName[size], className].filter(Boolean).join(' ');
  return (
    <button className={classes} {...rest}>
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}

export default Button;



