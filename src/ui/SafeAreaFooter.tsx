import React from 'react';

type SafeAreaFooterProps = React.HTMLAttributes<HTMLElement> & {
  align?: 'start' | 'center' | 'end' | 'space-between';
};

export function SafeAreaFooter({ align = 'end', className, children, ...rest }: SafeAreaFooterProps) {
  const rowStyle: React.CSSProperties = {
    justifyContent: align === 'start' ? 'flex-start' : align === 'center' ? 'center' : align === 'end' ? 'flex-end' : 'space-between',
  };
  return (
    <footer className={["ik-safe-footer", className].filter(Boolean).join(' ')} {...rest}>
      <div className="ik-safe-footer__row" style={rowStyle}>{children}</div>
    </footer>
  );
}

export default SafeAreaFooter;



