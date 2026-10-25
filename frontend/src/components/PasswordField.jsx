import { useState } from 'react';

export default function PasswordField({
  id,
  label,
  labelAccessory,
  error,
  hint,
  ...inputProps
}) {
  const [visible, setVisible] = useState(false);

  const describedBy =
    [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <div className="field-label-row">
        <label htmlFor={id}>{label}</label>
        {labelAccessory ? (
          <span className="field-accessory">{labelAccessory}</span>
        ) : null}
      </div>

      <div className="password-input">
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          {...inputProps}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          disabled={inputProps.disabled}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>

      {error ? (
        <p className="field-message field-message-error" id={`${id}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="field-message" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
