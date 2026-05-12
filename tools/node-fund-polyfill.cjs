/**
 * Node 环境下预加载：`@/utils/common` 会向 `window` 挂 JSONP 工具。
 * 在 ts-node/require 加载业务代码前先执行：`node -r ./tools/node-fund-polyfill.cjs …`
 */

/* eslint-disable no-undef */
if (typeof global !== 'undefined' && typeof global.window === 'undefined') {
  global.window = {};
}
if (!global.window.getJSONP) {
  global.window.getJSONP = Object.assign(() => {}, { counter: 0 });
}

if (!global.window.document) {
  global.window.document = {
    createElement() {
      return {
        referrerPolicy: '',
        src: '',
        onload: null,
        parentNode: {
          removeChild() {},
        },
      };
    },
    body: {
      appendChild() {},
    },
  };
}
