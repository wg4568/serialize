import { PackingMachine } from "./packer";
import { Int16, List, String8, Uint8 } from "./types";

var pm = new PackingMachine();
pm.format("PlayerData", [Int16, String8, Uint8, Uint8, Uint8]);
pm.format("List", [List]);

var players = [
    [342, "william", 255, 0, 0],
    [23, "gardna", 160, 0, 160],
    [564, "~~ woohoo ~~", 255, 255, 0],
    [78, "AAAAAA", 255, 0, 100]
];

var bytes = pm.pack("List", [players.map((p) => pm.pack("PlayerData", p))]);
var out = (pm.unpack(bytes).data[0] as Uint8Array[]).map(
    (p) => pm.unpack(p).data
);

console.log(bytes);
console.table(out);
