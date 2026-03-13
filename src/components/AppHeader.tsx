import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

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
        <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-sm">
          <Shield className="h-[18px] w-[18px] text-primary-foreground" />
        </div>
        <span className="text-[17px] font-bold tracking-tight text-foreground">
          {title || "FindMyScheme"}
        </span>
      </Link>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  </header>
);
