"use client";

import PhoneInput, { type Value } from "react-phone-number-input";
import fr from "react-phone-number-input/locale/fr";
import { cn } from "@/lib/utils";
import { SearchableCountrySelect } from "./SearchableCountrySelect";

import "react-phone-number-input/style.css";

type TelInputProps = {
  value: Value | undefined;
  onChange: (value: Value | undefined) => void;
  compact?: boolean;
  required?: boolean;
  placeholder?: string;
};

export function TelInput({
  value,
  onChange,
  compact = false,
  required = true,
  placeholder = "Téléphone",
}: TelInputProps) {
  return (
    <PhoneInput
      international
      defaultCountry="CD"
      countryCallingCodeEditable={false}
      countrySelectComponent={SearchableCountrySelect}
      labels={fr}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      className={cn(
        "tel-input",
        compact && "tel-input--compact",
      )}
      numberInputProps={{
        className: cn(
          "tel-input__field",
          compact && "tel-input__field--compact",
        ),
      }}
      countrySelectProps={{
        className: cn(
          "tel-input__country",
          compact && "tel-input__country--compact",
        ),
      }}
    />
  );
}
