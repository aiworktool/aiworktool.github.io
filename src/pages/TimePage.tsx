import { Link } from 'react-router-dom';
import { SiteFooter } from './SiteFooter';
import { TimeTools } from './TimeTools';
import { usePageTitle } from './usePageTitle';

const TITLE = '时间工具';

export default function TimePage() {
  usePageTitle(TITLE);
  return (
    <main>
      <p><Link to="/">返回首页</Link></p>
      <h1>{TITLE}</h1>
      <p className="privacy">这些时间只在本机计算，不上传。</p>
      <TimeTools />
      <SiteFooter />
    </main>
  );
}
