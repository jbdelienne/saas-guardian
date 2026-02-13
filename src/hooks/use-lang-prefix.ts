import { useParams } from 'react-router-dom';

/**
 * Returns the current language prefix for building internal links.
 * Usage: const lp = useLangPrefix(); <Link to={`${lp}/dashboard`}>
 */
export function useLangPrefix() {
  const { lang } = useParams<{ lang: string }>();
  return `/${lang || 'en'}`;
}
