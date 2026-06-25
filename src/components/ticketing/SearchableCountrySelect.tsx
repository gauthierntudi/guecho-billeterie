"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ElementType,
} from "react";
import { ChevronDown, Search } from "lucide-react";
import getUnicodeFlagIcon from "country-flag-icons/unicode";
import { cn } from "@/lib/utils";

type CountryOption = {
  value?: string;
  label: string;
  divider?: boolean;
};

type CountryIconProps = {
  country?: string;
  label?: string;
  aspectRatio?: number;
};

export type SearchableCountrySelectProps = {
  value?: string;
  onChange: (value: string | undefined) => void;
  options: CountryOption[];
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  iconComponent?: ElementType<CountryIconProps>;
  "aria-label"?: string;
};

export function SearchableCountrySelect({
  value,
  onChange,
  options,
  disabled,
  readOnly,
  className,
  iconComponent: Icon,
  "aria-label": ariaLabel,
}: SearchableCountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchId = useId();

  const selectableOptions = useMemo(
    () => options.filter((option) => !option.divider),
    [options],
  );

  const selectedOption = useMemo(
    () =>
      selectableOptions.find((option) => option.value === value) ??
      selectableOptions[0],
    [selectableOptions, value],
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return selectableOptions;

    return selectableOptions.filter(
      (option) =>
        option.label.toLowerCase().includes(normalizedQuery) ||
        option.value?.toLowerCase().includes(normalizedQuery),
    );
  }, [query, selectableOptions]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        close();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  const isInactive = disabled || readOnly;

  function renderFlag(country?: string, label?: string) {
    if (!country) return null;

    if (Icon) {
      return <Icon country={country} label={label} />;
    }

    return (
      <span className="tel-country-select__flag" aria-hidden>
        {getUnicodeFlagIcon(country)}
      </span>
    );
  }

  return (
    <div
      ref={rootRef}
      className={cn("PhoneInputCountry tel-country-select relative shrink-0", className)}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={isInactive}
        onClick={() => {
          if (!isInactive) setOpen((current) => !current);
        }}
        className="tel-country-select__trigger"
      >
        {renderFlag(value, selectedOption?.label)}
        <ChevronDown className="tel-country-select__chevron" aria-hidden />
      </button>

      {open ? (
        <div className="tel-country-select__dropdown">
          <div className="tel-country-select__search-wrap">
            <Search className="tel-country-select__search-icon" aria-hidden />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un pays"
              className="tel-country-select__search"
              autoFocus
            />
          </div>

          <ul className="tel-country-select__list" role="listbox">
            {filteredOptions.map((option) => (
              <li key={option.value ?? "international"}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={cn(
                    "tel-country-select__option",
                    option.value === value &&
                      "tel-country-select__option--active",
                  )}
                  onClick={() => {
                    onChange(option.value);
                    close();
                  }}
                >
                  {renderFlag(option.value, option.label)}
                  <span className="min-w-0 truncate">{option.label}</span>
                </button>
              </li>
            ))}

            {filteredOptions.length === 0 ? (
              <li className="tel-country-select__empty">Aucun pays trouvé</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
