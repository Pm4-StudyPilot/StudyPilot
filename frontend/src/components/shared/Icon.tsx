import { IconType } from 'react-icons';

interface IconProps {
  icon: IconType;
  size?: number | string;
  color?: string;
  className?: string;
  'aria-label'?: string;
  'aria-hidden'?: boolean;
}

export default function Icon({
  icon: IconComponent,
  size = 20,
  color,
  className,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden = !ariaLabel,
}: IconProps) {
  return (
    <IconComponent
      size={size}
      color={color}
      className={className}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
    />
  );
}
