import { Link } from 'react-router-dom';

export function UnsupportedPage() {
  return (
    <main>
      <h1>需要支持 WebGPU 的浏览器</h1>
      <p>请使用桌面版 Chrome 或 Edge 113 及以上打开本站。当前浏览器不能在本地完成转写和抠图。</p>
      <p><Link to="/">返回首页</Link></p>
    </main>
  );
}
