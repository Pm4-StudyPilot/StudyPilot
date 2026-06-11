import { useEffect, useMemo, useRef, useState } from 'react';

type ProgressRingProps = {
  openTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  totalTasks: number;
  label: string;
  accentColor?: string;
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

function shouldSkipProgressAnimation() {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canAnimate =
    typeof requestAnimationFrame === 'function' &&
    typeof cancelAnimationFrame === 'function' &&
    typeof performance !== 'undefined' &&
    typeof performance.now === 'function';

  return prefersReducedMotion || !canAnimate;
}

export default function ProgressRing({
  openTasks,
  inProgressTasks,
  completedTasks,
  totalTasks,
  label,
  accentColor,
  size = 40,
  className,
}: ProgressRingProps) {
  const targetSegments = useMemo(
    () => calculateSegmentPercentages(openTasks, inProgressTasks, completedTasks, totalTasks),
    [openTasks, inProgressTasks, completedTasks, totalTasks]
  );
  const [segments, setSegments] = useState(targetSegments);
  const segmentsRef = useRef(targetSegments);
  const classes = ['progress-ring', className].filter(Boolean).join(' ');
  const skipAnimation = shouldSkipProgressAnimation();

  useEffect(() => {
    if (skipAnimation) {
      segmentsRef.current = targetSegments;
      return;
    }

    const startSegments = segmentsRef.current;
    const duration = 520;
    const startTime = performance.now();

    function animateFrame(now: number) {
      const elapsed = Math.min((now - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - elapsed, 3);
      const nextSegments = {
        open: startSegments.open + (targetSegments.open - startSegments.open) * easedProgress,
        inProgress:
          startSegments.inProgress +
          (targetSegments.inProgress - startSegments.inProgress) * easedProgress,
        completed:
          startSegments.completed +
          (targetSegments.completed - startSegments.completed) * easedProgress,
      };

      segmentsRef.current = nextSegments;
      setSegments(nextSegments);

      if (elapsed < 1) {
        animationFrame = requestAnimationFrame(animateFrame);
      }
    }

    let animationFrame = requestAnimationFrame(animateFrame);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [skipAnimation, targetSegments]);

  // Build conic-gradient: OPEN (grey) -> IN_PROGRESS (blue) -> DONE (green) -> unfilled (dark)
  const displayedSegments = skipAnimation ? targetSegments : segments;
  const openEnd = displayedSegments.open;
  const inProgressEnd = openEnd + displayedSegments.inProgress;
  const completedEnd = inProgressEnd + displayedSegments.completed;

  const gradient = `conic-gradient(
    var(--progress-open-color) 0% ${openEnd}%,
    var(--progress-in-progress-color) ${openEnd}% ${inProgressEnd}%,
    var(--progress-completed-color) ${inProgressEnd}% ${completedEnd}%,
    var(--progress-track-color) ${completedEnd}% 100%
  )`;

  return (
    <div
      className={classes}
      style={
        {
          width: size,
          height: size,
          backgroundImage: gradient,
          '--progress-accent': accentColor,
        } as React.CSSProperties
      }
      title={label}
      aria-label={label}
      role="img"
    ></div>
  );
}
