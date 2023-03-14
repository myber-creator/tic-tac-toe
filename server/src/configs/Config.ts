import { Config } from "./../types/Config.js";

export const config: Config = {
  ports: [3001, 3002, 3003, 3004],
  indexPort: 0,
  currentPrimaryIndex: 0,
  port: 3001,
  httpServer: null,
  server: null,
};
