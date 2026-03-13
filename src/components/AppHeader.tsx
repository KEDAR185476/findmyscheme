import { Link } from "react-router-dom";
import logo from "@/assets/FindMyScheme_logo.png";
import { ThemeLangSwitcher } from "@/components/ThemeLangSwitcher";

export const AppHeader = ({
  title,
  children,
}: {
  title?: string;
  children?: React.ReactNode;
}) => (
  <header className="sticky top-0 z-50 glass-nav">
    <div className="container flex h-16 items-center justify-between">
      <Link to="/" className="flex items-center gap-2.5">
        <img src={logo} alt="FindMyScheme" className="h-9 w-9 object-contain" />
        <span className="text-[17px] font-bold tracking-tight text-foreground">
          {title || "FindMyScheme"}
        </span>
      </Link>
      <div className="flex items-center gap-2">
        {children}
        <ThemeLangSwitcher />
      </div>
    </div>
  </header>
);
