'use strict';

function calendarMarkup(compact = false) {
  const id = compact ? 'journey-calendar-aside' : 'journey-calendar';
  return `<section id="${id}" class="journey-calendar${compact ? ' jc-compact' : ''}" data-journey-calendar data-compact="${compact}" aria-label="行走的日子" data-calendar-url="/journey/calendar.json">
  <div class="jc-heading"><h2>行走的日子</h2><a href="${compact ? '/journey/' : '/map/'}">${compact ? '完整日历 ↗' : '铁路地图 ↗'}</a></div>
  ${compact ? '' : '<div class="jc-view-buttons" role="group" aria-label="日历视图"><button type="button" data-view="month" aria-pressed="true">月视图</button><button type="button" data-view="year" aria-pressed="false">全年视图</button></div>'}
  <div class="jc-layout"><div class="jc-month-panel">
    <div class="jc-controls"><button type="button" data-action="previous" aria-label="上个月">‹</button><div><label>年份 <select data-role="year" aria-label="选择年份"></select></label><label data-role="month-label">月份 <select data-role="month" aria-label="选择月份"></select></label></div><button type="button" data-action="next" aria-label="下个月">›</button></div>
    <div class="jc-weekdays" data-role="weekdays" aria-hidden="true"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div>
    <div class="jc-grid" data-role="grid" role="group" aria-label="选择日期"></div>
    <div class="jc-month-foot"><span data-role="month-summary"></span><button type="button" data-action="latest">最近记录</button></div>
    <div class="jc-key"><span><i class="jc-dot visit"></i>到访</span><span><i class="jc-dot train"></i>铁路</span><span><i class="jc-dot flight"></i>航班</span></div>
  </div><div data-role="detail-home"><div class="jc-detail" data-role="detail" aria-live="polite"><p>正在读取行程…</p></div></div></div>
  <dialog class="jc-modal" data-role="modal" aria-labelledby="${id}-selected-date"><button class="jc-modal-close" type="button" data-action="close-modal" aria-label="关闭行程卡片">×</button><div data-role="modal-content"></div></dialog>
  <noscript>请启用 JavaScript 查看旅行日历。</noscript>
</section>`;
}

module.exports = { calendarMarkup };
