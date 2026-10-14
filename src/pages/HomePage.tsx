import { Link } from 'react-router-dom';
import { SiteFooter } from './SiteFooter';
import { SITE_NAME, usePageTitle } from './usePageTitle';

export function HomePage() {
  usePageTitle(SITE_NAME);
  return (
    <main>
      <h1>{SITE_NAME}</h1>
      <p className="privacy">文字、图片和音频只在这台电脑的浏览器里处理，不上传。</p>
      <ul className="tools">
        <li>
          <Link to="/record">录音转文字</Link>
          <p>用麦克风录一段，停下来后再转成文稿。</p>
        </li>
        <li>
          <Link to="/audio-file">录音文件转文字</Link>
          <p>选择已有的 mp3、wav、m4a 或 webm，一次一个文件。</p>
        </li>
        <li>
          <Link to="/matting">抠图 / 证件照</Link>
          <p>去掉背景，换成白、蓝或红底，并裁成证件照尺寸。</p>
        </li>
        <li>
          <Link to="/json">JSON 格式化</Link>
          <p>把挤在一行里的 JSON 排成容易阅读的缩进文本。</p>
        </li>
        <li>
          <Link to="/json-diff">JSON 格式化比较</Link>
          <p>两边分别排版，再对照数据是否相同。</p>
        </li>
      </ul>
      <p>录音和抠图需要桌面版 Chrome 或 Edge 113 及以上。JSON 工具没有这个限制。</p>
      <SiteFooter />
    </main>
  );
}
