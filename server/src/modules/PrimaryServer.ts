import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { v4 } from "uuid";
import { Room } from "./Room.js";
import { NotFoundException } from "../types/Error.js";
import { useUrls } from "../helpers/useUrls.js";
import { portsCors } from "../data/Ports.js";
import { MoveDto } from "../dto/Move.dto.js";

const URLS = useUrls(portsCors);

export class PrimaryServer {
	private socketServer: Server;
	private connectedPorts: Map<string, number>;

	constructor(httpServer: HttpServer, rooms: Room[]) {
		this.socketServer = new Server(httpServer, {
			cors: {
				origin: URLS,
				methods: "*",
			},
		});

		this.connectedPorts = new Map<string, number>();
		console.log("Основной сервер запущен.");

		this.initEvents(rooms);

		console.log(rooms);
	}

	private initEvents(rooms: Room[]) {
		this.socketServer.on("connection", socket => {
			socket.on("serverConnect", port => {
				console.log("Установлено соединение с резервным сервером.");
				this.connectedPorts.set(socket.id, port);

				this.socketServer.to(socket.id).emit("rooms", rooms);

				for (const [id, p] of this.connectedPorts) {
					for (const port_ of this.connectedPorts.values()) {
						if (port_ !== p) {
							this.socketServer.to(id).emit("getPort", port_);
						}
					}
				}
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
					if (this.connectedPorts.has(socket.id)) {
						const port = this.connectedPorts.get(socket.id);

						for (let [server] of this.connectedPorts) {
							if (server !== socket.id) {
								this.socketServer.to(server).emit("removePort", port);
							}
						}

						return this.connectedPorts.delete(socket.id);
					}

					const room = rooms.find(r => r.users.includes(socket.id));

					if (room) {
						this.socketServer.to(room.name).emit("leaveGame", socket.id);

						rooms = this.clearRoom(rooms, room);
					}
				}
			});

			socket.on("startFind", () => {
				let room = rooms.find(r => r.users.length === 1);

				if (!room) {
					room = new Room(v4(), []);
					rooms.push(room);
					console.log(room, rooms);
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

				this.socketServer.to(room.name).emit("leaveGame", socket.id);

				rooms = this.clearRoom(rooms, room);
			});

			socket.on("makeMove", (dto: MoveDto) => {
				const room = rooms.find(r => r.users.includes(socket.id));

				if (!room) {
					this.emitErrors("Room is not founded!", socket.id);
					return;
				}

				const winner = room.setSymbolToBoard(dto.coords, dto.symbol);

				this.sendStateToReserves(rooms);

				this.socketServer.to(room.name).emit("setSymbol", {
					coords: dto.coords,
					symbol: dto.symbol,
					currentPlayer: room.currentPlayer,
				});

				if (winner) {
					this.socketServer.to(room.name).emit("winner", winner);

					rooms = this.clearRoom(rooms, room);
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
		for (let [server] of this.connectedPorts) {
			this.socketServer.to(server).emit("rooms", rooms);
		}
	}

	private clearRoom(rooms: Room[], room: Room) {
		rooms = rooms.filter(r => r.name !== room.name);
		this.socketServer.in(room.name).socketsLeave(room.name);

		this.sendStateToReserves(rooms);

		return rooms;
	}
}
