'use strict';

const redirects = {
  'categories/阅读/index.html': '/reading/',
  'categories/阅读/page/2/index.html': '/reading/',
  'categories/行走足迹/index.html': '/journey/',
  'categories/行走足迹/page/2/index.html': '/journey/',
  'categories/行走足迹/page/3/index.html': '/journey/'
};

hexo.extend.filter.register('after_generate', function () {
  const route = hexo.route;

  for (const [path, target] of Object.entries(redirects)) {
    route.set(path, htmlRedirect(target));
  }
});

function htmlRedirect(target) {
  return [
    '<!doctype html>',
    '<html lang="zh-CN">',
    '<head>',
    '  <meta charset="utf-8">',
    `  <meta http-equiv="refresh" content="0; url=${target}">`,
    `  <link rel="canonical" href="${target}">`,
    `  <script>location.replace(${JSON.stringify(target)});</script>`,
    '  <title>Redirecting...</title>',
    '</head>',
    '<body>',
    `  <p>Redirecting to <a href="${target}">${target}</a></p>`,
    '</body>',
    '</html>'
  ].join('\n');
}
