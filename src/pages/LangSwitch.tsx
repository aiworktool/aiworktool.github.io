import { Link, useLocation } from 'react-router-dom';
import { langFromPath, switchLang } from '../i18n/lang';
import { text } from '../i18n/text';

export function LangSwitch() {
  const { pathname } = useLocation();
  const lang = langFromPath(pathname);
  return (
    <nav className="lang-switch" aria-label={text(lang).langLabel}>
      <Link to={switchLang(pathname, 'zh')} aria-current={lang === 'zh' ? 'page' : undefined}>中文</Link>
      <span> / </span>
      <Link to={switchLang(pathname, 'en')} aria-current={lang === 'en' ? 'page' : undefined}>English</Link>
    </nav>
  );
}
