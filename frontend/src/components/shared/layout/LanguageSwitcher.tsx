import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../../locales';

const LANGUAGE_DISPLAY: Record<SupportedLanguage, { code: string; labelKey: string }> = {
  en: { code: 'EN', labelKey: 'common.language.english' },
  de: { code: 'DE', labelKey: 'common.language.german' },
};

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLanguage = (
    SUPPORTED_LANGUAGES.includes(i18n.resolvedLanguage as SupportedLanguage)
      ? i18n.resolvedLanguage
      : 'en'
  ) as SupportedLanguage;

  function handleSelect(lng: SupportedLanguage) {
    void i18n.changeLanguage(lng);
    setOpen(false);
  }

  return (
    <div className="language-switcher" ref={dropdownRef}>
      <button
        type="button"
        className="language-switcher__trigger dashboard-topbar__icon"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('common.language.switcherLabel')}
        onClick={() => setOpen((v) => !v)}
      >
        <i className="fa-solid fa-globe" aria-hidden="true" />
        <span className="language-switcher__code">{LANGUAGE_DISPLAY[activeLanguage].code}</span>
        <i
          className={`language-switcher__chevron fa-solid fa-chevron-${open ? 'up' : 'down'}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul className="language-switcher__menu" role="listbox">
          {SUPPORTED_LANGUAGES.map((lng) => {
            const isActive = lng === activeLanguage;
            return (
              <li key={lng} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={`language-switcher__option${isActive ? ' language-switcher__option--active' : ''}`}
                  onClick={() => handleSelect(lng)}
                >
                  <span className="language-switcher__option-code">
                    {LANGUAGE_DISPLAY[lng].code}
                  </span>
                  <span className="language-switcher__option-label">
                    {t(LANGUAGE_DISPLAY[lng].labelKey)}
                  </span>
                  {isActive && (
                    <i className="fa-solid fa-check ms-auto" aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
