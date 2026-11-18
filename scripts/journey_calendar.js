'use strict';

const { calendarMarkup } = require('../lib/journey-calendar-view.cjs');
const { calendarForBuild } = require('../lib/journey-calendar.cjs');

hexo.extend.generator.register('journey-calendar-data', function () {
  return { path: 'journey/calendar.json', data: calendarForBuild(hexo.base_dir, hexo.config.marked, process.env.BLOG_JOURNEY_CALENDAR_CACHE) };
});

hexo.extend.tag.register('journey_calendar', () => calendarMarkup());
hexo.extend.helper.register('journey_calendar_markup', calendarMarkup);
