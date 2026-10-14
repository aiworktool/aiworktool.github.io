import { Link } from 'react-router-dom';
import { SiteFooter } from './SiteFooter';

export function HomePage() {
  return (
    <main>
      <h1>本地处理</h1>
      <p className="privacy">图片和音频只在这台电脑的浏览器里处理，不上传。</p>
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
      </ul>
      <p>需要桌面版 Chrome 或 Edge 113 及以上。</p>
      <SiteFooter />
    </main>
  );
}
