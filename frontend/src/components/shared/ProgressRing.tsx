type ProgressRingProps = {
  openTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  totalTasks: number;
  label: string;
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
  size = 40,
  className,
}: ProgressRingProps) {
  const segments = calculateSegmentPercentages(
    openTasks,
    inProgressTasks,
    completedTasks,
    totalTasks
  );
  const notDoneTasks = openTasks + inProgressTasks;
  const classes = ['progress-ring', className].filter(Boolean).join(' ');

  // Build conic-gradient: OPEN (grey) -> IN_PROGRESS (blue) -> DONE (green) -> unfilled (dark)
  const openEnd = segments.open;
  const inProgressEnd = openEnd + segments.inProgress;
  const completedEnd = inProgressEnd + segments.completed;

  const gradient = `conic-gradient(
    #6c757d 0% ${openEnd}%,
    #0d6efd ${openEnd}% ${inProgressEnd}%,
    #198754 ${inProgressEnd}% ${completedEnd}%,
    #2e3050 ${completedEnd}% 100%
  )`;

  return (
    <div
      className={classes}
      style={{ width: size, height: size, backgroundImage: gradient }}
      title={label}
      aria-label={label}
      role="img"
    >
      <span className="progress-ring__label">{notDoneTasks}</span>
    </div>
  );
}
