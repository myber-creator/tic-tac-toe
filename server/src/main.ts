import express from "express";
import { createServer } from "http";
import { config } from "./configs/Config.js";
import { Room } from "./modules/Room.js";
import { faultTolerance } from "./modules/FaultTolerance.js";

// TODO:
// (2): При коннекте резервных серверов к основному основной отправляет rooms резервным.[X]
// (3): Добавить отправку флага, что пользователь реконнектнулся для правильного потвтора последнего эмита с клиента.[X]
// (4): Изменить отправку rooms на отправку только изменённой комнаты.
// (5): После победы/ничьи удалять руму.[X]

const rooms: Room[] = [];

const app = express();
const bootstrap = () => {
  const httpServer = createServer(app);

  httpServer.listen(config.port, () => {
    console.log(`Server is started on ${config.port}...`);
  });

  httpServer.on("error", (err: Error | any) => {
    if (err.code === "EADDRINUSE") {
      config.indexPort++;
      config.port = config.ports[config.indexPort];

      if (config.port) {
        httpServer.close();
        return bootstrap();
      }
    }
  });

  httpServer.on("listening", () => {
    config.currentPrimaryIndex = +process.argv[2] || config.currentPrimaryIndex;
    config.httpServer = httpServer;
    config.server = faultTolerance(config, rooms);
  });
};

bootstrap();
