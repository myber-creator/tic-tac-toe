import { LastEmit } from "./../types/LastEmit";
import { io, Socket } from "socket.io-client";
import { Room } from "../types/Room";
import { Game } from "../game/game";

export class SocketClient {
	private socket: Socket | null = null;
	private room: Room;

	private readonly ports: number[] = [3001, 3002, 3003, 3004];
	private currentPort: number = 0;
	private lastEmit: LastEmit;
	private isReconnecting: boolean = false;

	constructor(private game: Game) {
		this.room = {
			id: "",
			users: [],
		};
		this.lastEmit = { name: "" };

		this.connectToServer();
	}

	private createEmits() {
		if (!this.socket) return;

		this.socket.on("reconnect", () => {
			this.isReconnecting = false;
		});

		this.socket.on("connect", () => {});

		this.socket.on("join-room", (roomName: string) => {
			if (!this.room.id) this.room.id = roomName;
		});

		this.socket.on("start", (symbol: string) => {
			this.game.startGame(symbol);
		});

		this.socket.on("leaveGame", () => {
			this.game.enemyLeave();
			this.lastEmit = { name: "" };
			this.room.id = "";
		});

		this.socket.on("setSymbol", ({ coords, symbol, currentPlayer }) => {
			this.game.setCellSymbol(coords, symbol);
			this.game.setCurrentPlayer(currentPlayer);
		});

		this.socket.on("winner", winner => {
			this.game.setWinner(winner);
			this.lastEmit = { name: "" };
		});

		this.socket.on("Error", error => {
			throw new Error(error.body);
		});

		this.socket.on("connect_error", () => {
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

				const port = this.connectToServer();

				if (port) {
					this.socket.emit("reconnectClient", this.room.id);
					console.log(this.room.id);

					if (this.lastEmit.name && this.isReconnecting) {
						this.socket.emit(this.lastEmit.name, this.lastEmit.data);
					}
				}
			}
		});
	}

	private connectToServer() {
		let port = this.ports[this.currentPort];

		if (!port) {
			this.currentPort = 0;
			port = this.ports[this.currentPort];
		}

		this.socket = io(`localhost:${port}`, {
			autoConnect: this.isReconnecting,
		});

		this.createEmits();

		return port;
	}

	public findGame() {
		if (!this.socket) return;

		this.socket.connect();
		this.socket.emit("startFind");

		this.lastEmit = {
			name: "startFind",
		};
	}

	public startGame() {
		if (!this.socket) return;

		this.socket.emit("startGame", this.room.id);

		this.lastEmit = {
			name: "startGame",
			data: this.room.id,
		};
	}

	public leaveGame() {
		if (!this.socket) return;

		this.socket.emit("leaveGame", this.room.id);
		this.room.id = "";

		this.lastEmit = {
			name: "leaveGame",
			data: this.room.id,
		};
	}

	public makeMove(coords: number[], symbol: string) {
		if (!this.socket) return;

		this.socket.emit("makeMove", { coords, symbol });

		this.lastEmit = {
			name: "makeMove",
			data: { coords, symbol },
		};
	}
}
