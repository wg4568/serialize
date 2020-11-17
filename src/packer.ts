import { FlagArray, Type, Uint8 } from "./types";

function joinBuffers(buffers: Uint8Array[]) {
    var length = buffers.map((b) => b.length).reduce((a, b) => a + b);
    var tmp = new Uint8Array(length);
    var idx = 0;

    for (var i = 0; i < buffers.length; i++) {
        tmp.set(buffers[i], idx);
        idx += buffers[i].length;
    }

    return tmp;
}

export type Data =
    | string
    | number
    | boolean
    | FlagArray
    | Uint8Array
    | Uint8Array[];
type Format = {
    serialized: number;
    schema: Type<any>[];
};

export class PackingMachine {
    private formats: Map<string, Format> = new Map<string, Format>();
    private serializer: Map<number, string> = new Map<number, string>();

    format(name: string, format: Type<any>[]): void {
        var id = this.formats.size;
        this.serializer.set(id, name);
        this.formats.set(name, {
            serialized: id,
            schema: format
        });
    }

    pack(type: string, data: Data[]): Uint8Array {
        var format = this.formats.get(type) as Format;
        if (!format) throw new Error("format does not exist");

        var encoded: Uint8Array[] = [];
        for (var i = 0; i < format.schema.length; i++) {
            encoded.push(format.schema[i].Encode(data[i]));
        }

        return joinBuffers([Uint8.Encode(format.serialized), ...encoded]);
    }

    unpack(data: Uint8Array): { name: string; data: Data[] } {
        var id = data[0];

        var name = this.serializer.get(id);
        if (!name) throw new Error("format does not exist");

        var format = this.formats.get(name);
        if (!format) throw new Error("format does not exist");

        var idx = 1;
        var array: Data[] = [];
        for (var i = 0; i < format.schema.length; i++) {
            let elem = format.schema[i].Decode(data, idx);
            idx += format.schema[i].Length(elem);
            array.push(elem);
        }

        return { name: name, data: array };
    }
}
