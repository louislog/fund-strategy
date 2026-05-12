import { defineConfig } from '@umijs/max';

// Umi 4 + Webpack 5：https://umijs.org/
export default defineConfig({
  title: '基金定投策略分析',
  /** 禁用 Max 自带的 ProLayout，否则与手写顶栏叠加会出现双标题栏 */
  layout: false,
  history: { type: 'hash' },
  publicPath: '/fund/',
  npmClient: 'npm',
  antd: {},
  routes: [
    {
      path: '/',
      component: '@/layouts/BasicLayout',
      routes: [
        { path: '/', component: '@/pages/index' },
        { path: '/compare', component: '@/pages/compare/compare' },
        { path: '/portfolio', component: '@/pages/portfolio/index' },
      ],
    },
  ],
});
