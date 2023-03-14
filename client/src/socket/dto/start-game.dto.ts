import { User } from "../../types/User";

export interface StartGameDto {
  currentPlayer: User;

  players: User[];
}
