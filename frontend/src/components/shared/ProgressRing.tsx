type ProgressRingProps = {
  openTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  totalTasks: number;
  label: string;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'quaternary';
  size?: number;
  className?: string;
};

function calculateSegmentPercentages(
  openTasks: number,
  inProgressTasks: number,
  completedTasks: number,
  totalTasks: number
): { open: number; inProgress: number; completed: number } {
  if (totalTasks === 0) {
    return { open: 0, inProgress: 0, completed: 0 };
  }

  return {
    open: Math.round((openTasks / totalTasks) * 100),
    inProgress: Math.round((inProgressTasks / totalTasks) * 100),
    completed: Math.round((completedTasks / totalTasks) * 100),
  };
}

export default function ProgressRing({
  openTasks,
  inProgressTasks,
  completedTasks,
  totalTasks,
  label,
  variant = 'primary',
  size = 40,
  className,
}: ProgressRingProps) {
  const segments = calculateSegmentPercentages(
    openTasks,
    inProgressTasks,
    completedTasks,
    totalTasks
  );
  const classes = ['progress-ring', `progress-ring--${variant}`, className]
    .filter(Boolean)
    .join(' ');

  // Build conic-gradient: OPEN (grey) -> IN_PROGRESS (blue) -> DONE (green) -> unfilled (dark)
  const openEnd = segments.open;
  const inProgressEnd = openEnd + segments.inProgress;
  const completedEnd = inProgressEnd + segments.completed;

  const gradient = `conic-gradient(
    var(--progress-open-color) 0% ${openEnd}%,
    var(--progress-in-progress-color) ${openEnd}% ${inProgressEnd}%,
    var(--progress-completed-color) ${inProgressEnd}% ${completedEnd}%,
    var(--progress-track-color) ${completedEnd}% 100%
  )`;

  return (
    <div
      className={classes}
      style={{ width: size, height: size, backgroundImage: gradient }}
      title={label}
      aria-label={label}
      role="img"
    ></div>
  );
}
