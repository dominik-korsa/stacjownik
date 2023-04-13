export const headIds = [
  'station',
  'abbr',
  'min-lvl',
  'status',
  'dispatcher',
  'dispatcher-lvl',
  'routes',
  'general',
] as const;

export const headIconsIds = ['user', 'spawn', 'timetable'] as const;

export type HeadIdsTypes = typeof headIds[number] | typeof headIconsIds[number];
