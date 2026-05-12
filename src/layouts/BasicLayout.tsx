import React from 'react';
import { Outlet } from '@umijs/max';
import styles from './index.css';
import Menu from 'antd/es/menu';

function currentHashPath(): string {
  const h = (typeof window !== 'undefined' && window.location.hash.replace(/^#/, '')) || '/'
  return h.replace(/^\s*/, '') || '/'
}

/** 不使用 layouts/index.tsx 文件名：避免 @umijs/max 约定布局与自定义路由布局重复挂载 */
const BasicLayout: React.FC = () => {
  const [path, setPath] = React.useState(currentHashPath)

  React.useEffect(() => {
    const onHash = () => setPath(currentHashPath())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const pageTitle =
    path.startsWith('/portfolio') ? '组合回测' :
    path.startsWith('/compare') ? '策略对比' : '单基回测'

  return (
    <div className={styles.pageRoot}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <span className={styles.brandTitle}>基金投资策略分析</span>
            <span className={styles.brandSubtitle}>{pageTitle}</span>
          </div>
          <Menu
            mode="horizontal"
            selectedKeys={[path.startsWith('/portfolio') ? '/portfolio' : path.startsWith('/compare') ? '/compare' : '/']}
            className={styles.navMenu}
          >
            <Menu.Item key="/">
              <a href="#/">单基回测</a>
            </Menu.Item>
            <Menu.Item key="/compare">
              <a href="#/compare">策略对比</a>
            </Menu.Item>
            <Menu.Item key="/portfolio">
              <a href="#/portfolio">组合回测</a>
            </Menu.Item>
          </Menu>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
};

export default BasicLayout;
