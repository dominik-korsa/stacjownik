import { Availability } from './store/storeTypes';
import {ScheduledTrain} from './ScheduledTrain';
import StationRoutes from './StationRoutes';

export default interface Station {
  name: string;

  generalInfo?: {
    name: string;
    url: string;
    abbr: string;

    reqLevel: number;
    // supportersOnly: boolean;

    
    lines: string;
    project: string;
    projectUrl?: string;

    signalType: string;
    controlType: string;

    SUP: boolean;
    authors?: string[];

    availability: Availability;
    routes: StationRoutes;

    checkpoints: {
      checkpointName: string;
      scheduledTrains: ScheduledTrain[];
    }[];
  };

  onlineInfo?: {
    hash: string;
    name: string;
    region: string;

    maxUsers: number;
    currentUsers: number;

    spawns: { spawnName: string; spawnLength: number; isElectrified: boolean }[];
    dispatcherRate: number;
    dispatcherName: string;
    dispatcherExp: number;
    dispatcherId: number;
    dispatcherIsSupporter: boolean;

    statusTimestamp: number;
    // statusTimeString: string;
    statusID: string;

    stationTrains?: {
      driverName: string;
      driverId: number;
      trainNo: number;
      trainId: string;
      stopStatus?: string;
    }[];

    scheduledTrains?: ScheduledTrain[];
  };
}
