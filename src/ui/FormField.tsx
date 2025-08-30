import React from 'react';

type BaseProps = {
  id: string;
  label: string;
  required?: boolean;
  helpText?: string;
  error?: string;
  children: React.ReactElement;
};

export function FormField({ id, label, required, helpText, error, children }: BaseProps) {
  const control = React.cloneElement(children, {
    id,
    'aria-invalid': Boolean(error) || undefined,
    'aria-describedby': [helpText ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined,
    className: ['ik-field__control', children.props.className].filter(Boolean).join(' '),
  });

  return (
    <div className="ik-field">
      <label className="ik-field__label" htmlFor={id}>
        {label}
        {required ? <span className="ik-field__required" aria-hidden> *</span> : null}
      </label>
      {control}
      {helpText ? (
        <div id={`${id}-help`} className="ik-field__help">{helpText}</div>
      ) : null}
      {error ? (
        <div id={`${id}-error`} className="ik-field__error">{error}</div>
      ) : null}
    </div>
  );
}

export default FormField;



