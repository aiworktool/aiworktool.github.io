import { Link } from 'react-router-dom';

export function SiteFooter() {
  return (
    <footer>
      <p>
        语音模型：OpenAI Whisper（MIT），页面使用 Xenova/whisper-base 与可选的
        Xenova/whisper-small 量化权重。
      </p>
      <p>
        抠图模型：MODNet（Apache-2.0），上游 ZHKKKe/MODNet，浏览器权重 Xenova/modnet。
      </p>
      <p><Link to="/">便捷工具</Link></p>
    </footer>
  );
}
