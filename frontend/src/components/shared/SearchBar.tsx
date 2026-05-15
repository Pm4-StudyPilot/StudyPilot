type SearchBarProps = {
  /**
   * Current value of the search input.
   */
  value: string;

  /**
   * Callback function triggered when the search input changes.
   */
  onChange: (value: string) => void;

  /**
   * Placeholder text displayed inside the search input.
   *
   * @default 'Search...'
   */
  placeholder?: string;

  /**
   * HTML id used for the input and label connection.
   *
   * @default 'search'
   */
  id?: string;

  /**
   * Additional CSS classes for spacing or layout adjustments.
   */
  className?: string;
};

/**
 * Reusable search bar component.
 *
 * Can be used for filtering courses, tasks, documents,
 * quizzes, or other searchable content across the application.
 */
export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  id = 'search',
  className = '',
}: SearchBarProps) {
  return (
    <div className={`input-group mb-3${className ? ` ${className}` : ''}`}>
      <span className="input-group-text bg-transparent border-secondary text-secondary">
        <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
      </span>

      <input
        id={id}
        type="search"
        className="form-control bg-transparent border-secondary text-white"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-label={placeholder}
      />
    </div>
  );
}
