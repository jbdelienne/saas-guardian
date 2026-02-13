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
    // Extract the path after the current lang prefix
    const pathParts = location.pathname.split('/').filter(Boolean);
    const currentPrefix = pathParts[0];
    const isLangPrefix = supportedLanguages.some((l) => l.code === currentPrefix);

    const restParts = isLangPrefix ? pathParts.slice(1) : pathParts;
    const newPath = `/${code}${restParts.length ? '/' + restParts.join('/') : ''}`;

    i18n.changeLanguage(code);
    // Use window.location for a clean navigation to avoid React Router nested route issues
    window.location.href = newPath + location.search + location.hash;
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
