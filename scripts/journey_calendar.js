'use strict';

const { buildCalendar } = require('../lib/journey-calendar.cjs');

hexo.extend.generator.register('journey-calendar-data', function () {
  return { path: 'journey/calendar.json', data: JSON.stringify(buildCalendar(hexo.base_dir)) };
});

hexo.extend.tag.register('journey_calendar', function () {
  return `<link rel="stylesheet" href="/css/journey-calendar.css?v=20261116-1">
<section id="journey-calendar" class="journey-calendar" aria-label="旅行日历" data-calendar-url="/journey/calendar.json">
  <div class="jc-heading"><div><span class="jc-eyebrow">行走的日子</span><h2>旅行日历</h2><p>选一个日期，重走那天的旅程。</p></div><a href="/map/">铁路地图 ↗</a></div>
  <div class="jc-layout"><div class="jc-month-panel">
    <div class="jc-controls"><button type="button" data-action="previous" aria-label="上个月">‹</button><div><label>年份 <select data-role="year" aria-label="选择年份"></select></label><label>月份 <select data-role="month" aria-label="选择月份"></select></label></div><button type="button" data-action="next" aria-label="下个月">›</button></div>
    <div class="jc-weekdays" aria-hidden="true"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div>
    <div class="jc-grid" data-role="grid" role="group" aria-label="选择日期"></div>
    <div class="jc-month-foot"><span data-role="month-summary"></span><button type="button" data-action="latest">最近记录</button></div>
    <div class="jc-key"><span><i class="jc-dot visit"></i>游览</span><span><i class="jc-dot train"></i>铁路</span><span><i class="jc-dot flight"></i>航班</span></div>
  </div><div class="jc-detail" data-role="detail" aria-live="polite"><p>正在读取行程…</p></div></div>
  <noscript>请启用 JavaScript 查看旅行日历。</noscript>
</section><script defer src="/js/journey-calendar.js?v=20261116-1"></script>`;
});
