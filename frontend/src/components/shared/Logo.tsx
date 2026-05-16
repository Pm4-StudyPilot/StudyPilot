import { faGraduationCap } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export default function Logo({ className }: { className?: string }) {
  return (
    <span className={className}>
      <FontAwesomeIcon icon={faGraduationCap} className="me-2 fas" />
      StudyPilot
    </span>
  );
}
