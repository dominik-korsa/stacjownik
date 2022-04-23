import TrainStop from "./TrainStop";

export default interface ScheduledTrain {
    trainNo: number;
    driverName: string;
    driverId: number;
    currentStationName: string;
    currentStationHash: string;
    category: string;
    stopInfo: TrainStop;

    terminatesAt: string;
    beginsAt: string;

    prevStationName: string;
    nextStationName: string;

    stopLabel: string;
    stopStatus: string;
    stopStatusID: number;
}