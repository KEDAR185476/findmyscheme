import { Sun, Moon, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTheme } from "@/context/ThemeContext";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ta", label: "தமிழ்" },
  { code: "hi", label: "हिन्दी" },
];

export function ThemeLangSwitcher() {
  const { theme, toggleTheme } = useTheme();
  const { i18n, t } = useTranslation();

  return (
    <div className="flex items-center gap-1">
      {/* Theme toggle */}
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={toggleTheme} title={theme === "dark" ? t("light_mode") : t("dark_mode")}>
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      {/* Language selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title={t("language")}>
            <Globe className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[120px]">
          {LANGUAGES.map(lang => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
              className={i18n.language === lang.code ? "font-semibold bg-muted" : ""}
            >
              {lang.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
