import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageTransition } from "@/components/PageTransition";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <PageTransition>
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="mb-4 text-6xl font-extrabold text-primary">404</h1>
          <p className="mb-6 text-xl text-muted-foreground">{t("page_not_found")}</p>
          <Button asChild className="rounded-full px-6">
            <a href="/"><Home className="mr-2 h-4 w-4" /> {t("return_home")}</a>
          </Button>
        </div>
      </div>
    </PageTransition>
  );
};

export default NotFound;