// Shared context so the slug page can push its headings to the layout sidebar
"use client";

import { createContext, useContext, useState, useCallback } from "react";

export interface DocHeading {
  id: string;
  text: string;
  level: number;
}

interface DocsContextValue {
  headings: DocHeading[];
  setHeadings: (headings: DocHeading[]) => void;
}

const DocsContext = createContext<DocsContextValue>({
  headings: [],
  setHeadings: () => {},
});

export function DocsProvider({ children }: { children: React.ReactNode }) {
  const [headings, setHeadingsState] = useState<DocHeading[]>([]);
  const setHeadings = useCallback((h: DocHeading[]) => setHeadingsState(h), []);
  return (
    <DocsContext.Provider value={{ headings, setHeadings }}>
      {children}
    </DocsContext.Provider>
  );
}

export function useDocsContext() {
  return useContext(DocsContext);
}
