"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { niches, type Niche, type NicheId } from "@/lib/niches";

type NicheContextValue = {
  niche: Niche;
  nicheId: NicheId;
  companyName: string;
  setNicheId: (id: NicheId) => void;
  setCompanyName: (name: string) => void;
};

type NicheProviderProps = {
  children: React.ReactNode;
  initialNicheId?: NicheId;
  initialCompanyName?: string;
  initialTheme?: Niche["theme"];
};

const NicheContext = createContext<NicheContextValue | null>(null);

export function NicheProvider({
  children,
  initialNicheId = "climatizacao",
  initialCompanyName = "Clima Prime",
  initialTheme,
}: NicheProviderProps) {
  const [nicheId, updateNicheId] = useState<NicheId>(initialNicheId);
  const [companyName, updateCompanyName] = useState(initialCompanyName);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      if (initialNicheId !== "climatizacao" || initialCompanyName !== "Clima Prime") return;
      const savedNiche = window.localStorage.getItem("kronos:niche") as NicheId | null;
      const savedCompany = window.localStorage.getItem("kronos:company");
      if (savedNiche && niches[savedNiche]) updateNicheId(savedNiche);
      if (savedCompany) updateCompanyName(savedCompany);
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, [initialCompanyName, initialNicheId]);

  const setNicheId = (id: NicheId) => {
    updateNicheId(id);
    window.localStorage.setItem("kronos:niche", id);
  };

  const setCompanyName = (name: string) => {
    updateCompanyName(name);
    window.localStorage.setItem("kronos:company", name);
  };

  const value = useMemo(
    () => ({ niche: niches[nicheId], nicheId, companyName, setNicheId, setCompanyName }),
    [companyName, nicheId],
  );

  const theme = initialTheme ?? niches[nicheId].theme;
  const variables = {
    "--tenant-primary": theme.primary,
    "--tenant-accent": theme.accent,
    "--tenant-soft": theme.soft,
    "--tenant-line": theme.line,
  } as React.CSSProperties;

  return (
    <NicheContext.Provider value={value}>
      <div className="tenant-root" style={variables}>{children}</div>
    </NicheContext.Provider>
  );
}

export function useNiche() {
  const context = useContext(NicheContext);
  if (!context) throw new Error("useNiche must be used inside NicheProvider");
  return context;
}
