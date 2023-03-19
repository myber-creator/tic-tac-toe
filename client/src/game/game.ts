import { Cell } from "./cell";
import { SocketClient } from "../socket/socket";

export class Game {
  private socketClient: SocketClient;

  private button: HTMLButtonElement | null;
  private info: HTMLDivElement | null;

  public currentPlayer: string;
  public isStart: boolean;
  public inSearch: boolean;
  public symbol: string;

  public cells: Cell[];

  constructor() {
    this.button = document.querySelector<HTMLButtonElement>("#button");
    this.info = document.querySelector(".info");

    if (this.button) this.button.innerText = "Начать игру";
    this.currentPlayer = "X";

    this.socketClient = new SocketClient(this);

    this.isStart = false;
    this.inSearch = false;
    this.symbol = "X";

    this.cells = [];
    this.initCells();

    this.createEvents();
  }

  private initCells() {
    const m = 3;
    document.querySelectorAll<HTMLDivElement>(".cell").forEach((c, index) => {
      const cell = new Cell(
        [Math.floor(index / m), index - Math.floor(index / m) * m],
        c
      );

      this.cells.push(cell);
    });
  }

  private createEvents() {
    this.button?.addEventListener("click", () => {
      this.setButton();
    });

    this.cells.forEach(cell => {
      cell.element.addEventListener("click", () => {
        if (this.isStart) {
          if (!cell.symbol && this.currentPlayer === this.symbol) {
            this.socketClient.makeMove(cell.coords, this.symbol);
          }
        }
      });
    });
  }

  public setButton(winner?: string) {
    if (this.button) {
      if (this.button.innerText === "Начать игру") {
        this.clearBoard();

        this.button.innerText = "Покинуть игру";

        this.inSearch = true;
        this.socketClient.findGame();
        this.setInfo("Поиск противника...");

        return;
      }

      if (this.button.innerText === "Покинуть игру") {
        this.isStart = false;

        this.button.innerText = "Начать игру";

        if (!winner) {
          this.inSearch = false;
          this.socketClient.leaveGame();
          this.setInfo("");
        }
        return;
      }
    }
  }

  public setInfo(info: string) {
    if (this.info) {
      this.info.innerText = info;
    }
  }

  private clearBoard() {
    this.currentPlayer = "X";

    this.cells.forEach(cell => {
      cell.symbol = "";
      cell.element.innerText = "";
    });

    this.isStart = false;

    this.setInfo("");
  }

  public startGame(symbol: string) {
    this.inSearch = false;
    this.isStart = true;
    this.symbol = symbol;

    const move =
      this.symbol === this.currentPlayer ? "Ваш ход." : "Ход противника.";

    this.setInfo(`Противник найден. ${move}`);
  }

  public setCellSymbol(coords: number[], symbol: string) {
    const cell = this.cells.find(
      c => c.coords[0] === coords[0] && c.coords[1] === coords[1]
    );

    if (cell) {
      cell.element.innerText = symbol;
      cell.symbol = symbol;
    }
  }

  public setCurrentPlayer(currentPlayer: string) {
    this.currentPlayer = currentPlayer;

    if (this.info) {
      const move =
        this.symbol === this.currentPlayer ? "Ваш ход." : "Ход противника.";

      this.setInfo(move);
    }
  }

  public setWinner(winner: string) {
    this.setButton(winner);

    if (this.info) {
      const winnerText = winner === "tie" ? "Ничья" : `Победитель ${winner}`;

      this.setInfo(winnerText);
    }
  }

  public enemyLeave() {
    this.inSearch = true;
    this.isStart = false;

    this.setButton();

    this.setInfo("Противник покинул игру.");
  }
}
