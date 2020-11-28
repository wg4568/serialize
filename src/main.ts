import { Data, PackingMachine } from "./packer";
import { Int16, List, String8, Uint8 } from "./types";

var pm = new PackingMachine();
pm.format("Player", [Int16, String8, Uint8, Uint8, Uint8]);
pm.format("PlayerArray", [List]);

// var out = (pm.unpack(bytes).data[0] as Uint8Array[]).map(
//     (p) => pm.unpack(p).data
// );

var players = [
    [342, "william", 255, 0, 0],
    [23, "gardna", 160, 0, 160],
    [564, "~~ woohoo ~~", 255, 255, 0],
    [78, "AAAAAA", 255, 0, 100]
];

pm.on("PlayerArray", (data: Data[]) => {
    type player = [number, string, number, number];
    var array = data[0] as Uint8Array[];
    var players: player[] = [];

    array.forEach((r) => {
        players.push(pm.unpack(r).data as player);
    });

    console.table(players);
});

var bytes = pm.pack("PlayerArray", [players.map((p) => pm.pack("Player", p))]);
pm.receive(bytes);
