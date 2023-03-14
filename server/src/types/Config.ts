import { ReserveServer } from "./../modules/ReserveServer.js";
import { PrimaryServer } from "./../modules/PrimaryServer.js";
import { Server } from "http";

export interface Config {
  readonly ports: number[];
  connectedPorts: number[];
  indexPort: number;
  currentPrimaryIndex: number;
  port: number;
  httpServer: Server | null;
  server: PrimaryServer | ReserveServer | null;
}
