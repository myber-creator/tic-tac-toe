export class Cell {
  public symbol: string;

  constructor(public coords: cell, public element: HTMLDivElement) {
    this.symbol = "";
  }
}

type cell = [number, number];
