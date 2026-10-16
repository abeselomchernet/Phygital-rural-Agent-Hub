import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getPresentationCopy,
  isPresentationLanguage,
  localizeWorkspaceGroup,
  localizeWorkspaceItem,
  presentationLocaleMetadata,
  type PresentationLanguage,
} from "../localization/presentationCatalog";

type PresentationLocalizationValue = {
  language: PresentationLanguage;
  setLanguage: (language: PresentationLanguage) => void;
  copy: ReturnType<typeof getPresentationCopy>;
  metadata: (typeof presentationLocaleMetadata)[PresentationLanguage];
  workspaceGroupLabel: (id: string, fallback: string) => string;
  workspaceItemLabel: (id: string, fallback: string) => string;
};

const PresentationLocalizationContext = createContext<PresentationLocalizationValue | null>(null);

export function PresentationLocalizationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<PresentationLanguage>("en");
  const value = useMemo<PresentationLocalizationValue>(() => ({
    language,
    setLanguage,
    copy: getPresentationCopy(language),
    metadata: presentationLocaleMetadata[language],
    workspaceGroupLabel: (id, fallback) => localizeWorkspaceGroup(language, id, fallback),
    workspaceItemLabel: (id, fallback) => localizeWorkspaceItem(language, id, fallback),
  }), [language]);

  return (
    <PresentationLocalizationContext.Provider value={value}>
      {children}
    </PresentationLocalizationContext.Provider>
  );
}

export function usePresentationLocalization() {
  const context = useContext(PresentationLocalizationContext);
  if (!context) throw new Error("PRESENTATION_LOCALIZATION_PROVIDER_REQUIRED");
  return context;
}

export function usePresentationCopy() {
  return usePresentationLocalization().copy;
}

export function parsePresentationLanguage(value: string): PresentationLanguage {
  return isPresentationLanguage(value) ? value : "en";
}
