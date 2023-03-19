import { LastEmit } from "./../types/LastEmit";
import { io, Socket } from "socket.io-client";
import { Room } from "../types/Room";
import { Game } from "../game/game";

export class SocketClient {
  private socket: Socket | null = null;
  private room: Room;

  private lastEmit: LastEmit = { name: "" };

  private readonly ports: number[] = [3001, 3002, 3003, 3004];
  private currentPort: number = 0;
  private isReconnecting: boolean = false;

  private countConnecting: number = 0;

  constructor(private game: Game) {
    this.room = {
      id: "",
    };

    this.connectToServer();
  }

  private createEmits() {
    if (!this.socket) return;

    this.socket.on("reconnectEnemy", () => {
      if (this.lastEmit.name) {
        this.socket?.emit(this.lastEmit.name, this.lastEmit.data);
        this.setLastEmit("");
      }
    });

    this.socket.on("reconnect", () => {
      this.isReconnecting = false;
      this.setLastEmit("");
    });

    this.socket.on("connect", () => {
      this.countConnecting = 0;

      if (this.isReconnecting) {
        this.socket?.emit("reconnectClient", this.room.id);

        if (this.lastEmit.name) {
          this.socket?.emit(this.lastEmit.name, this.lastEmit.data);
          this.setLastEmit("");
        }
      }
    });

    this.socket.on("join-room", (roomName: string) => {
      if (!this.room.id) this.room.id = roomName;
      this.setLastEmit("");
    });

    this.socket.on("start", (symbol: string) => {
      this.game.startGame(symbol);
      this.setLastEmit("");
    });

    this.socket.on("leaveGame", () => {
      this.room.id = "";
      this.game.enemyLeave();

      this.setLastEmit("");
    });

    this.socket.on("setSymbol", ({ coords, symbol, currentPlayer }) => {
      this.game.setCellSymbol(coords, symbol);
      this.game.setCurrentPlayer(currentPlayer);

      this.setLastEmit("");
    });

    this.socket.on("winner", winner => {
      this.game.setWinner(winner);

      this.setLastEmit("");
    });

    this.socket.on("Error", error => {
      throw new Error(error.message);
    });

    this.socket.on("connect_error", () => {
      if (this.countConnecting === 5) {
        this.socket?.close();

        this.game.setButton();
        this.game.setInfo("Ошибка подключения.");

        this.room.id = "";
        this.countConnecting = 0;
        this.isReconnecting = false;
        this.lastEmit = { name: "" };

        return;
      }

      this.isReconnecting = true;
      this.socket?.close();
      this.currentPort++;
      this.connectToServer();
    });

    this.socket.on("disconnect", reason => {
      if (!this.socket) return;

      if (reason === "transport close") {
        this.isReconnecting = true;
        this.currentPort++;
        this.socket.close();

        this.connectToServer();
      }
    });
  }

  private connectToServer() {
    let port = this.ports[this.currentPort];

    if (!port) {
      this.currentPort = 0;
      port = this.ports[this.currentPort];

      this.countConnecting++;
    }

    this.socket = io(`localhost:${port}`, {
      autoConnect: this.isReconnecting,
    });

    this.createEmits();
  }

  private setLastEmit(name: string, data?: any) {
    this.lastEmit = { name, data };
  }

  public findGame() {
    if (!this.socket) return;

    this.socket.connect();
    this.socket.emit("startFind");

    this.setLastEmit("startFind");
  }

  public leaveGame() {
    if (!this.socket) return;

    if (!this.room.id) return;

    this.socket.emit("leaveGame", this.room.id);
    this.room.id = "";

    this.setLastEmit("leaveGame", this.room.id);
  }

  public makeMove(coords: number[], symbol: string) {
    if (!this.socket) return;

    this.socket.emit("makeMove", { coords, symbol });

    this.lastEmit = { name: "makeMove", data: { coords, symbol } };
  }
}
