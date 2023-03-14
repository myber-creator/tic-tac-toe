import { RoomDto } from "../dto/Room.dto.js";

export class Room {
  private _board: string[][];
  private _available: number[][];
  private _currentPlayer = "X";
  private _currentIndex = 0;
  private readonly players = ["X", "O"];

  constructor(private _name: string, private _users: string[]) {
    this._board = [
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
    ];

    this._available = [];
    this.initAvailable();
  }

  public get name() {
    return this._name;
  }

  public get users() {
    return this._users;
  }

  public set users(value: string[]) {
    this._users = [...value];
  }

  public get currentPlayer() {
    return this._currentPlayer;
  }

  public setAvailable(newAvailable: number[][]) {
    this._available = newAvailable;
  }

  public get available() {
    return this._available;
  }

  public get board() {
    return this._board;
  }

  public get currentIndex() {
    return this._currentIndex;
  }

  public setBoard(newBoard: string[][]) {
    this._board = newBoard;
  }

  public setCurrentIndex(index: number) {
    this._currentIndex = index;
  }

  public setCurrentPlayer(value: string) {
    this._currentPlayer = value;
  }

  public setSymbolToBoard(coords: number[], symbol: string) {
    if (this._board[coords[0]][coords[1]] !== "") return;

    this._board[coords[0]][coords[1]] = symbol;

    const index = (this._currentIndex + 1) % this.players.length;

    this._currentPlayer = this.players[index];
    this._currentIndex = index;

    const cellIndex = this._available.findIndex(
      a => a[0] === coords[0] && a[1] === coords[1]
    );

    this._available.splice(cellIndex, 1);

    const winner = this.checkWinner();

    return winner;
  }

  private equals3(a: string, b: string, c: string) {
    return a == b && b == c && a != "";
  }

  private checkWinner() {
    let winner: string | null = null;

    for (let i = 0; i < 3; i++) {
      if (
        this.equals3(this._board[i][0], this._board[i][1], this._board[i][2])
      ) {
        winner = this._board[i][0];
      }
    }
    for (let i = 0; i < 3; i++) {
      if (
        this.equals3(this._board[0][i], this._board[1][i], this._board[2][i])
      ) {
        winner = this._board[0][i];
      }
    }

    if (this.equals3(this._board[0][0], this._board[1][1], this._board[2][2])) {
      winner = this._board[0][0];
    }
    if (this.equals3(this._board[2][0], this._board[1][1], this._board[0][2])) {
      winner = this._board[2][0];
    }

    if (winner == null && this._available.length == 0) {
      return "tie";
    }

    return winner;
  }

  private initAvailable() {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        this._available.push([i, j]);
      }
    }
  }

  public setProps(props: RoomDto) {
    this.setCurrentPlayer(props._currentPlayer);
    this.setAvailable(props._available);
    this.setBoard(props._board);
    this.setCurrentIndex(props._currentIndex);
  }
}
