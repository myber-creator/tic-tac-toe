export class ErrorException {
  public type: string = "Error";

  constructor(public message: string = "") {}
}

export class NotFoundException extends ErrorException {
  constructor(message: string) {
    super(message);
    this.type = "NotFound";
  }
}
