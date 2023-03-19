import { io } from "socket.io-client";
import { Room } from "./Room.js";
import { Socket } from "socket.io-client";
import { faultTolerance } from "./FaultTolerance.js";
import { Config } from "./../types/Config.js";
import { RoomDto } from "../dto/Room.dto.js";

export class ReserveServer {
  private socket: Socket;
  private connectedPorts: number[];

  constructor(public config: Config, rooms: Room[]) {
    console.log("Резервный сервер запущен.");

    this.socket = io(
      `http://localhost:${this.config.ports[this.config.currentPrimaryIndex]}`
    );
    this.socket.emit("serverConnect", this.config.port);

    this.connectedPorts = [];
    this.initEvents(rooms);

    console.log("Установлено соедение с основным сервером.");
  }

  private initEvents(rooms: Room[]) {
    this.socket.on("rooms", (roomDtos: RoomDto[]) => {
      rooms = [
        ...roomDtos.map(r => {
          const room = new Room(r._name, []);

          room.setProps(r);
          return room;
        }),
      ];
    });

    this.socket.on("getPort", port => {
      this.connectedPorts.push(port);
    });

    this.socket.on("removePort", port => {
      this.connectedPorts = this.connectedPorts.filter(p => p !== port);
    });

    this.socket.on("disconnect", reason => {
      if (reason === "transport close") {
        console.log("Соединение с основным сервером разорвано.");

        this.config.currentPrimaryIndex++;

        const port = this.config.ports[this.config.currentPrimaryIndex];
        if (
          !port ||
          (!this.connectedPorts.find(p => p === port) &&
            port !== this.config.port)
        ) {
          this.config.currentPrimaryIndex = 0;
        }

        if (this.config.httpServer)
          this.config.server = faultTolerance(this.config, rooms);
      }
    });
  }
}
