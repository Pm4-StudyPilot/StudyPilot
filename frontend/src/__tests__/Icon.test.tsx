import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MdHome } from 'react-icons/md';
import Icon from '../components/shared/Icon';

describe('Icon', () => {
  it('renders an svg element', () => {
    const { container } = render(<Icon icon={MdHome} />);

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('applies aria-label when provided', () => {
    render(<Icon icon={MdHome} aria-label="Home" />);

    expect(screen.getByLabelText('Home')).toBeInTheDocument();
  });

  it('is aria-hidden by default when no aria-label is given', () => {
    const { container } = render(<Icon icon={MdHome} />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('is not aria-hidden when aria-label is provided', () => {
    render(<Icon icon={MdHome} aria-label="Home" />);

    const svg = screen.getByLabelText('Home');
    expect(svg).not.toHaveAttribute('aria-hidden', 'true');
  });

  it('applies custom className', () => {
    const { container } = render(<Icon icon={MdHome} className="my-icon" />);

    expect(container.querySelector('svg')).toHaveClass('my-icon');
  });
});
