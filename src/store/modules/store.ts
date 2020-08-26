import { VuexModule, Module, Mutation, Action } from "vuex-module-decorators";
import axios from "axios";
import data from "@/data/stations.json";

import Station from "@/scripts/interfaces/Station";

enum ConnState {
  Loading = 0,
  Error = 1,
  Connected = 2,
}

const apiURLS = {
  stationDataURL: "https://api.td2.info.pl:9640/?method=getStationsOnline",
  trainDataURL: "https://api.td2.info.pl:9640/?method=getTrainsOnline",
  dispatcherDataURL:
    "https://api.td2.info.pl:9640/?method=readFromSWDR&value=getDispatcherStatusList%3B1",
};

interface TimetableResponseData {
  stopPoints:
    | {
        arrivalTime: string;
        arrivalDelay: number;
        departureTime: string;
        departureDelay: number;
        pointNameRAW: string;
      }[]
    | [];
  trainInfo: {
    timetableId: number;
    trainCategoryCode: string;
  };
}

interface OnlineStationsResponseData {
  stationName: string;
  stationHash: string;
  maxUsers: number;
  currentUsers: number;
  spawnString: string;
  dispatcherRate: number;
  dispatcherName: string;
  dispatcherExp: number;
  dispatcherId: number;
  region: string;
  isOnline: number;
}

let onlineStationsData: OnlineStationsResponseData[];

let onlineDispatchersData: [string, string, number, number][];

let onlineTrainsData: {
  isOnline: number;
  region: string;
  trainNo: number;
  station: { stationName: string };
}[];

const queryStations = (async () => {
  return (await axios.get(apiURLS.stationDataURL)).data.message;
})();

const queryTrains = (async () => {
  return await (await axios.get(apiURLS.trainDataURL)).data.message;
})();

const queryDisptachers = (async () => {
  return await (await axios.get(apiURLS.dispatcherDataURL)).data.message;
})();

const queryTimetableData = async (
  trainNo: number
): Promise<TimetableResponseData> =>
  (
    await axios.get(
      `https://api.td2.info.pl:9640/?method=readFromSWDR&value=getTimetable%3B${trainNo}%3Beu`
    )
  ).data.message;

async function getScheduledTrains(stationName: string) {
  let scheduledTrains: any[] = [];

  for (let train of onlineTrainsData) {
    if (train.region !== "eu" || !train.isOnline) continue;

    const timetable = await queryTimetableData(train.trainNo);

    if (!timetable.trainInfo) continue;

    const stop = timetable.stopPoints.find((point) => {
      return (
        stationName.toLowerCase().includes(point.pointNameRAW.toLowerCase()) ||
        stationName
          .toLowerCase()
          .includes(point.pointNameRAW.toLowerCase().split(" ")[0]) ||
        stationName
          .toLowerCase()
          .includes(point.pointNameRAW.toLowerCase().split(",")[0])
      );
    });

    if (!stop) continue;

    scheduledTrains.push({
      arrivalTime: stop?.arrivalTime,
      departureTime: stop?.departureTime,
      trainCategory: timetable.trainInfo?.trainCategoryCode,
      trainNo: train.trainNo,
    });
  }

  return scheduledTrains;
}

async function testLoad() {
  let scheduledTrains: any[] = [];

  for (let train of onlineTrainsData) {
    if (train.region !== "eu" || !train.isOnline) continue;

    const timetable = await queryTimetableData(train.trainNo);

    if (!timetable.trainInfo) continue;

    timetable.stopPoints.forEach((point) => {
      const station = onlineStationsData.find(
        (online) =>
          online.stationName
            .toLowerCase()
            .includes(point.pointNameRAW.toLowerCase()) ||
          online.stationName
            .toLowerCase()
            .includes(point.pointNameRAW.toLowerCase().split(" ")[0]) ||
          online.stationName
            .toLowerCase()
            .includes(point.pointNameRAW.toLowerCase().split(",")[0])
      );

      if (!station) return;

      if (!scheduledTrains[station.stationName])
        scheduledTrains[station.stationName] = [];

      if (
        scheduledTrains[station.stationName].find(
          (scheduled) => train.trainNo === scheduled.trainNo
        )
      )
        return;

      scheduledTrains[station.stationName].push({
        arrivalTime: point?.arrivalTime,
        departureTime: point?.departureTime,
        trainCategory: timetable.trainInfo?.trainCategoryCode,
        trainNo: train.trainNo,
      });
    });
  }

  return scheduledTrains;
}

@Module
class Store extends VuexModule {
  private trainCount: number = 0;
  private stationCount: number = 0;

  private connectionState: ConnState = ConnState.Loading;

  private stations: Station[] = [];

  // private scheduledTrains: {
  //   trainNo: number;
  //   trainCategory: string;
  //   arrivalTime: string;
  //   departureTime: string;
  // }[] = [];

  private filteredStations: {}[] = [];

  private filterInitStates = {
    default: false,
    notDefault: false,
    nonPublic: false,
    SPK: false,
    SCS: false,
    ręczne: false,
    mechaniczne: false,
    współczesna: false,
    kształtowa: false,
    historyczna: false,
    mieszana: false,
    minLevel: 0,
    minOneWayCatenary: 0,
    minOneWay: 0,
    minTwoWayCatenary: 0,
    minTwoWay: 0,
    "no-1track": false,
    "no-2track": false,
    free: true,
    occupied: false,
    ending: false,
  } as const;

  private filters: any = { ...this.filterInitStates };

  get getStationCount(): number {
    return this.stationCount;
  }

  get getTrainCount(): number {
    return this.trainCount;
  }

  get getStations() {
    return this.filteredStations;
  }

  get getAllStations() {
    return this.stations;
  }

  get getFilters() {
    return this.filters;
  }

  get getConnectionState() {
    return this.connectionState;
  }

  @Action
  public setFilter(payload: { filterName: string; value: number | boolean }) {
    this.context.commit("mutateFilter", payload);
    this.context.commit("filterStations");
  }

  @Action
  public resetFilters() {
    this.context.commit("resetFilterList");
    this.context.commit("filterStations");
  }

  @Action
  public initStations() {
    this.context.commit("loadAllStations");
    this.context.dispatch("fetchStations");

    setInterval(() => this.context.dispatch("fetchStations"), 10000);
  }

  @Action
  private fetchStations() {
    Promise.all([queryStations, queryTrains, queryDisptachers])
      .then(async (response) => {
        onlineStationsData = response[0];
        onlineTrainsData = response[1];
        onlineDispatchersData = response[2];

        const updatedStations = await Promise.all(
          onlineStationsData
            .filter((station) => station.region === "eu" && station.isOnline)
            .map(async (station) => {
              const stationStatus = onlineDispatchersData.find(
                (status) =>
                  status[0] == station.stationHash && status[1] == "eu"
              );

              let statusLabel = "";
              let statusTimestamp = -1;

              if (!stationStatus) statusLabel = "NIEZALOGOWANY";
              else {
                let statusCode = stationStatus[2];
                statusTimestamp = stationStatus[3];

                statusLabel = "NIEDOSTĘPNY";

                switch (statusCode) {
                  case 0:
                    if (statusTimestamp - Date.now() > 21000000)
                      statusLabel = "BEZ LIMITU";
                    else
                      statusLabel =
                        "DO " +
                        new Date(statusTimestamp).toLocaleTimeString("en-US", {
                          hour12: false,
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                    break;

                  case 1:
                    statusLabel = "Z/W";
                    break;

                  case 2:
                    if (statusTimestamp == 0) statusLabel = "KOŃCZY";
                    break;

                  case 3:
                    statusLabel = "BRAK MIEJSCA";
                    break;

                  default:
                    break;
                }
              }

              const trains = onlineTrainsData.filter(
                (train) =>
                  train.region === "eu" &&
                  train.isOnline &&
                  train.station.stationName === station.stationName
              );

              const stationData = data.find(
                (s) => s.stationName === station.stationName
              ) || { stationName: station.stationName, stationURL: "" };

              // let scheduledTrains = await getScheduledTrains(
              //   station.stationName
              // );

              let scheduledTrains: any[] = [];

              return {
                ...stationData,
                stationHash: station.stationHash,
                maxUsers: station.maxUsers,
                currentUsers: station.currentUsers,
                spawnString:
                  station.spawnString &&
                  station.spawnString
                    .split(";")
                    .map((v) =>
                      v.split(",")[6] ? v.split(",")[6] : v.split(",")[0]
                    ),
                dispatcherName: station.dispatcherName,
                dispatcherRate: station.dispatcherRate,
                dispatcherId: station.dispatcherId,
                dispatcherExp: station.dispatcherExp,
                occupiedTo: statusLabel,
                statusTimestamp,
                trains,
                scheduledTrains,
              };
            })
        );

        // const scheduled = await testLoad();

        // for (let stationName in scheduled) {
        //   let t = updatedStations.find(
        //     (updated) => updated.stationName === stationName
        //   );

        //   if (!t) continue;

        //   t.scheduledTrains = scheduled[stationName];
        // }

        this.context.commit("updateStations", {
          updatedStations,
          trainCount: onlineTrainsData.filter(
            (train) => train.isOnline && train.region === "eu"
          ).length,
        });

        this.context.commit("filterStations");
        this.context.commit("setConnState", ConnState.Connected);
      })
      .catch((err) => {
        this.context.commit("setConnState", ConnState.Error);
      });
  }

  @Mutation
  private filterStations() {
    this.filteredStations = this.stations.filter((station) => {
      if ((station.nonPublic || !station.reqLevel) && this.filters["nonPublic"])
        return false;
      if (!station.reqLevel || station.reqLevel == "-1") return true;

      if (
        station.online &&
        station.occupiedTo == "KOŃCZY" &&
        this.filters["ending"]
      )
        return false;
      if (station.online && this.filters["occupied"]) return false;
      if (!station.online && this.filters["free"]) return false;

      if (station.default && this.filters["default"]) return false;
      if (!station.default && this.filters["notDefault"]) return false;

      if (station.reqLevel < this.filters["minLevel"]) return false;

      if (
        this.filters["no-1track"] &&
        (station.routes.oneWay.catenary != 0 ||
          station.routes.oneWay.noCatenary != 0)
      )
        return false;
      if (
        this.filters["no-2track"] &&
        (station.routes.twoWay.catenary != 0 ||
          station.routes.twoWay.noCatenary != 0)
      )
        return false;

      if (station.routes.oneWay.catenary < this.filters["minOneWayCatenary"])
        return false;
      if (station.routes.oneWay.noCatenary < this.filters["minOneWay"])
        return false;

      if (station.routes.twoWay.catenary < this.filters["minTwoWayCatenary"])
        return false;
      if (station.routes.twoWay.noCatenary < this.filters["minTwoWay"])
        return false;

      if (this.filters[station.controlType]) return false;
      if (this.filters[station.signalType]) return false;

      if (this.filters["SPK"] && station.controlType.includes("SPK"))
        return false;
      if (this.filters["SCS"] && station.controlType.includes("SCS"))
        return false;
      if (
        this.filters["mechaniczne"] &&
        station.controlType.includes("mechaniczne")
      )
        return false;
      if (this.filters["ręczne"] && station.controlType.includes("ręczne"))
        return false;

      return true;
    });
  }

  @Mutation
  private loadAllStations() {
    this.stations = data.map((stationData) => ({
      stationProject: "",
      spawnString: "",
      stationHash: "",
      maxUsers: 0,
      currentUsers: 0,
      dispatcherName: "",
      dispatcherRate: 0,
      dispatcherExp: -1,
      dispatcherId: 0,
      online: false,
      occupiedTo: "WOLNA",
      statusTimestamp: 0,
      scheduledTrains: [],
      ...stationData,
    }));
  }

  @Mutation
  private updateStations({ updatedStations, trainCount }) {
    for (let i = 0; i < this.stations.length; i++) {
      const toUpdate: any = updatedStations.find(
        (updated: any) => updated.stationName === this.stations[i].stationName
      );

      if (!toUpdate) {
        this.stations[i].online = false;
        this.stations[i].occupiedTo = "WOLNA";
        this.stations[i].statusTimestamp = -1;
        this.stations[i].dispatcherExp = -1;
        continue;
      }

      this.stations[i] = { ...this.stations[i], ...toUpdate };
      this.stations[i].online = true;

      updatedStations = updatedStations.filter(
        (updated: any) => updated.stationName !== this.stations[i].stationName
      );
    }

    // Dodawanie do listy online potencjalnych scenerii niewpisanych do bazy
    updatedStations.forEach((updated: any) => {
      const toUpdate: any = this.stations.find(
        (station) => station.stationName === updated.stationName
      );

      if (!toUpdate) {
        this.stations.push({ ...updated, online: true, reqLevel: "-1" });
      }
    });

    // Aktualizacja liczników
    this.stationCount = this.stations.filter(
      (station) => station.online
    ).length;
    this.trainCount = trainCount;
  }

  @Mutation
  private mutateFilter(payload: {
    filterName: string;
    value: number | boolean;
  }) {
    this.filters[payload.filterName] = payload.value;
  }

  @Mutation
  private resetFilterList() {
    this.filters = { ...this.filterInitStates };
  }

  @Mutation
  private setConnState(state: ConnState) {
    this.connectionState = state;
  }
}

export default Store;
