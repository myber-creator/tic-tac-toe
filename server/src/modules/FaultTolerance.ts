import { PrimaryServer } from "./PrimaryServer.js";
import { ReserveServer } from "./ReserveServer.js";
import { Room } from "./Room.js";
import { Config } from "../types/Config.js";

export const faultTolerance = (config: Config, rooms: Room[]) => {
  if (config.ports[config.currentPrimaryIndex] === config.port) {
    if (config.httpServer) return new PrimaryServer(config.httpServer, rooms);
  }

  return new ReserveServer(config, rooms);
};
