import { io } from "socket.io-client";
import { Room } from "./Room.js";
import { Socket } from "socket.io-client";
import { faultTolerance } from "./FaultTolerance.js";
import { Config } from "./../types/Config.js";
import { RoomDto } from "../dto/Room.dto.js";

export class ReserveServer {
  private socket: Socket;

  constructor(public config: Config, rooms: Room[]) {
    this.socket = io(
      `http://localhost:${this.config.ports[this.config.currentPrimaryIndex]}`
    );

    this.socket.emit("serverConnect");

    this.initEvents(rooms);

    console.log("init reserve");
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

      // console.log(rooms);
    });

    this.socket.on("disconnect", reason => {
      if (reason === "transport close") {
        this.config.currentPrimaryIndex++;

        if (this.config.httpServer)
          this.config.server = faultTolerance(this.config, rooms);
      }
    });
  }
}
