import { Link } from 'react-router-dom';
import { SiteFooter, ModnetNote, WhisperNote } from './SiteFooter';
import { TimeTools } from './TimeTools';
import { SITE_NAME, usePageTitle } from './usePageTitle';

export function HomePage() {
  usePageTitle(SITE_NAME);
  return (
    <main>
      <h1>{SITE_NAME}</h1>
      <p className="privacy">文字、图片和音频只在这台电脑的浏览器里处理，不上传。</p>
      <ul className="tools">
        <li>
          <p className="tool-group">JSON</p>
          <div className="tool-entry">
            <Link to="/json">JSON 格式化</Link>
            <p>把挤在一行里的 JSON 排成容易阅读的缩进文本。</p>
          </div>
          <div className="tool-entry">
            <Link to="/json-diff">JSON 格式化比较</Link>
            <p>两边分别排版，再对照数据是否相同。</p>
          </div>
        </li>
      </ul>
      <TimeTools embedded />
      <ul className="tools">
        <li>
          <p className="tool-group">编码与哈希</p>
          <div className="tool-entry">
            <Link to="/base64">Base64</Link>
            <p>文本和 Base64 互转，可选 URL 安全写法。</p>
          </div>
          <div className="tool-entry">
            <Link to="/url">URL 编码</Link>
            <p>把查询参数里的中文和空格编成百分号，或还原回来。</p>
          </div>
          <div className="tool-entry">
            <Link to="/jwt">JWT 解码</Link>
            <p>查看令牌的头部和载荷。不验证签名。</p>
          </div>
          <div className="tool-entry">
            <Link to="/sha256">SHA-256</Link>
            <p>计算一段文本的摘要。只出十六进制，不能解密。</p>
          </div>
        </li>
        <li>
          <Link to="/regex">正则测试</Link>
          <p>用 JavaScript 正则看匹配和捕获组。</p>
        </li>
        <li>
          <Link to="/record">录音转文字</Link>
          <p>用麦克风录一段，停下来后再转成文稿。</p>
          <WhisperNote />
        </li>
        <li>
          <Link to="/audio-file">录音文件转文字</Link>
          <p>选择已有的 mp3、wav、m4a 或 webm，一次一个文件。</p>
          <WhisperNote />
        </li>
        <li>
          <Link to="/matting">抠图 / 证件照</Link>
          <p>去掉背景，换成白、蓝或红底，并裁成证件照尺寸。</p>
          <ModnetNote />
        </li>
      </ul>
      <p>录音和抠图需要桌面版 Chrome 或 Edge 113 及以上。时间、JSON、编码和正则工具没有这个限制。</p>
      <SiteFooter />
    </main>
  );
}
