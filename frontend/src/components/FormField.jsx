export default function FormField({
  id,
  label,
  error,
  hint,
  type = 'text',
  ...inputProps
}) {
  const describedBy =
    [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...inputProps}
      />
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
