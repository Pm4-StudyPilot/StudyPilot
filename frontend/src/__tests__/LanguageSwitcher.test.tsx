import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import i18n from '../i18n';
import LanguageSwitcher from '../components/shared/layout/LanguageSwitcher';

describe('LanguageSwitcher', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the active language code with the dropdown closed', () => {
    render(<LanguageSwitcher />);

    const trigger = screen.getByRole('button', { name: /language/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveTextContent('EN');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens the dropdown when the trigger is clicked', () => {
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: /language/i }));

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('closes the dropdown when the trigger is clicked again', () => {
    render(<LanguageSwitcher />);

    const trigger = screen.getByRole('button', { name: /language/i });
    fireEvent.click(trigger);
    fireEvent.click(trigger);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('changes the active language when an option is selected', async () => {
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: /language/i }));
    fireEvent.click(screen.getByRole('option', { name: /deutsch/i }));

    expect(i18n.resolvedLanguage).toBe('de');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sprache/i })).toHaveTextContent('DE');
  });

  it('marks the currently active option as selected', () => {
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: /language/i }));

    const englishOption = screen.getByRole('option', { name: /english/i });
    const germanOption = screen.getByRole('option', { name: /deutsch/i });

    expect(englishOption).toHaveAttribute('aria-selected', 'true');
    expect(germanOption).toHaveAttribute('aria-selected', 'false');
  });

  it('closes the dropdown when clicking outside of it', () => {
    render(
      <div>
        <LanguageSwitcher />
        <button type="button">outside</button>
      </div>
    );

    fireEvent.click(screen.getByRole('button', { name: /language/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('button', { name: /outside/i }));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('falls back to English when the resolved language is unsupported', async () => {
    await i18n.changeLanguage('fr');

    render(<LanguageSwitcher />);

    expect(screen.getByRole('button', { name: /language/i })).toHaveTextContent('EN');
  });
});
