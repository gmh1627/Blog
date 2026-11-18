'use strict';

const { calendarMarkup } = require('../lib/journey-calendar-view.cjs');
const { buildCalendar } = require('../lib/journey-calendar.cjs');

hexo.extend.generator.register('journey-calendar-data', function () {
  return { path: 'journey/calendar.json', data: JSON.stringify(buildCalendar(hexo.base_dir, hexo.config.marked)) };
});

hexo.extend.tag.register('journey_calendar', () => calendarMarkup());
hexo.extend.helper.register('journey_calendar_markup', calendarMarkup);
