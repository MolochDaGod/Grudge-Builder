import { Schema, MapSchema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") id: string = "";
  @type("string") characterId: string = "";
  @type("string") characterName: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") action: string = "idle";
  @type("number") health: number = 100;
  @type("number") maxHealth: number = 100;
  @type("number") mana: number = 50;
  @type("number") maxMana: number = 50;
  @type("number") level: number = 1;
  @type("string") className: string = "";
  @type("string") faction: string = "";
}

export class RoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("number") tick: number = 0;
  @type("string") roomName: string = "";
}
