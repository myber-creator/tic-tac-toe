import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { v4 } from "uuid";
import { Room } from "./Room.js";
import { NotFoundException } from "../types/Error.js";
import { useUrls } from "../helpers/useUrls.js";
import { portsCors } from "../data/Ports.js";

const URLS = useUrls(portsCors);

export class PrimaryServer {
  private servers: string[] = [];
  private socketServer: Server;

  constructor(httpServer: HttpServer, rooms: Room[]) {
    this.socketServer = new Server(httpServer, {
      cors: {
        origin: URLS,
        methods: "*",
      },
    });

    this.initEvents(rooms);

    console.log("init primary");
  }

  private initEvents(rooms: Room[]) {
    this.socketServer.on("connection", socket => {
      socket.on("serverConnect", () => {
        this.servers.push(socket.id);
        console.log(this.servers);

        this.socketServer.to(socket.id).emit("rooms", rooms);
      });

      socket.on("reconnectClient", (roomName: string) => {
        const room = rooms.find(r => r.name === roomName);

        if (room) {
          room.users.push(socket.id);
          socket.join(roomName);
        }

        this.socketServer.to(socket.id).emit("reconnect");
      });

      socket.on("disconnect", reason => {
        if (reason === "transport close") {
          if (this.servers.includes(socket.id)) {
            return (this.servers = this.servers.filter(s => s !== socket.id));
          }

          const room = rooms.find(r => r.users.includes(socket.id));

          if (room) {
            const index = room.users.findIndex(u => u === socket.id);

            room.users.splice(index, 1);
            socket.leave(room.name);
            this.socketServer.to(room.name).emit("leaveGame", socket.id);
          }
        }
      });

      socket.on("startFind", () => {
        let room = rooms.find(r => r.users.length === 1);

        if (!room) {
          room = new Room(v4(), []);
          rooms.push(room);
        }
        socket.join(room.name);
        socket.emit("join-room", room.name);

        room.users.push(socket.id);

        this.sendStateToReserves(rooms);

        if (room.users.length > 1) {
          this.startGame(room);
        }
      });

      socket.on("startGame", (nameRoom: string) => {
        const room = rooms.find(r => r.name === nameRoom);

        if (!room) {
          this.emitErrors("Room is not founded!", socket.id);
          return;
        }

        this.sendStateToReserves(rooms);

        this.startGame(room);
      });

      socket.on("leaveGame", (nameRoom: string) => {
        const room = rooms.find(r => r.name === nameRoom);

        if (!room) {
          this.emitErrors("Room is not founded!", socket.id);
          return;
        }

        room.users = room.users.filter(u => u !== socket.id);
        socket.leave(room.name);

        this.sendStateToReserves(rooms);

        this.socketServer.to(room.name).emit("leaveGame", socket.id);
      });

      socket.on("makeMove", ({ coords, symbol }) => {
        const room = rooms.find(r => r.users.includes(socket.id));

        if (!room) {
          this.emitErrors("Room is not founded!", socket.id);
          return;
        }

        const winner = room.setSymbolToBoard(coords, symbol);

        this.sendStateToReserves(rooms);

        this.socketServer.to(room.name).emit("setSymbol", {
          coords,
          symbol,
          currentPlayer: room.currentPlayer,
        });

        if (winner) {
          this.socketServer.to(room.name).emit("winner", winner);

          rooms = rooms.filter(r => r.name !== room.name);
          this.socketServer.in(room.name).socketsLeave(room.name);

          this.sendStateToReserves(rooms);
        }
      });
    });
  }

  private emitErrors(body: string, id: string) {
    this.socketServer.to(id).emit("Error", new NotFoundException(body));
  }

  private startGame(room: Room) {
    const symbols = this.shuffle(["X", "O"]);

    for (let user of room.users) {
      this.socketServer.to(user).emit("start", symbols[0]);

      symbols.splice(0, 1);
    }
  }

  private shuffle(array: string[]) {
    let currentIndex = array.length,
      randomIndex;

    while (currentIndex != 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex],
      ];
    }

    return array;
  }

  private sendStateToReserves(rooms: Room[]) {
    for (let server of this.servers) {
      this.socketServer.to(server).emit("rooms", rooms);
    }
  }
}
