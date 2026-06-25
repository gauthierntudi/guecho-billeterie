"use client";

import { useEffect, useRef } from "react";

type CardPaymentRedirectProps = {
  url: string;
  params: Record<string, string>;
};

export function CardPaymentRedirect({ url, params }: CardPaymentRedirectProps) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (Object.keys(params).length === 0) {
      window.location.assign(url);
      return;
    }
    formRef.current?.submit();
  }, [url, params]);

  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm text-white/60">
        Redirection vers le paiement par carte...
      </p>
      <form ref={formRef} method="POST" action={url}>
        {Object.entries(params).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
      </form>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
    </div>
  );
}
