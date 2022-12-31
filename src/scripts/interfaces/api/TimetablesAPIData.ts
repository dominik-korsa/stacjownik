export interface TimetableHistory {
  id: number;
  
  timetableId: number;
  trainNo: number;
  trainCategoryCode: string;
  driverId: number;
  driverName: string;
  route: string;
  twr: number;
  skr: number;
  sceneriesString: string;

  routeDistance: number;
  currentDistance: number;

  confirmedStopsCount: number;
  allStopsCount: number;

  beginDate: string;
  endDate: string;

  scheduledBeginDate: string;
  scheduledEndDate: string;

  terminated: boolean;
  fulfilled: boolean;

  authorName?: string;
  authorId?: number;

  stockString?: string;
  stockMass?: number;
  stockLength?: number;
  maxSpeed?: number;

  hashesString?: string;
  currentSceneryName?: string;
  currentSceneryHash?: string;
}

export interface SceneryTimetableHistory {
  sceneryTimetables: TimetableHistory[];
  totalCount: number;
  sceneryName: string;
}
