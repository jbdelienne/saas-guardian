import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '@/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher({ variant = 'ghost' }: { variant?: 'ghost' | 'outline' }) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const currentLang = supportedLanguages.find((l) => l.code === i18n.language) ?? supportedLanguages[0];

  const switchLanguage = (code: string) => {
    // Replace current lang prefix with new one
    const pathParts = location.pathname.split('/');
    const currentPrefix = pathParts[1];
    const isLangPrefix = supportedLanguages.some((l) => l.code === currentPrefix);

    let newPath: string;
    if (isLangPrefix) {
      pathParts[1] = code;
      newPath = pathParts.join('/');
    } else {
      newPath = `/${code}${location.pathname}`;
    }

    i18n.changeLanguage(code);
    navigate(newPath + location.search + location.hash, { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="sm" className="gap-1.5 text-muted-foreground">
          <Globe className="w-4 h-4" />
          <span className="text-xs uppercase">{currentLang.code}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {supportedLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => switchLanguage(lang.code)}
            className={i18n.language === lang.code ? 'bg-accent' : ''}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
