function convertToBase(val: number, base: number, length?: number): number[] {
    var result: number[] = [];

    while (val > 0) {
        let rem = val % base;
        result.push(rem);
        val = Math.floor(val / base);
    }

    if (length) {
        if (result.length > length) throw new Error("out of bounds");
        while (result.length < length) result.push(0);
    }

    return result;
}

function convertFromBase(val: number[], base: number): number {
    var result = 0;

    for (var i = 0; i < val.length; i++) {
        let place = Math.pow(base, i);
        result += val[i] * place;
    }

    return result;
}

function integerRange(
    val: number,
    bits: number,
    signed: boolean = false
): boolean {
    var max = Math.pow(2, bits);
    var min = 0;
    if (signed) {
        max -= max / 2;
        min -= max;
    }
    console.log(min, max);
    return val < max && val >= min;
}

function getSubArray(data: Uint8Array, idx: number, length: number): number[] {
    return Array.from(data.subarray(idx, idx + length));
}

type Type<Data> = {
    Encode: (data: Data) => Uint8Array;
    Decode: (data: Uint8Array, idx?: number) => Data;
    Length: (data: Data) => number;
};

export const String8: Type<string> = {
    Length: (data: string) => {
        return 1 + data.length;
    },
    Encode: (data: string) => {
        var array = new Uint8Array(1 + data.length);
        array.set(Uint8.Encode(data.length), 0);

        for (var i = 0; i < data.length; i++) {
            array[i + 1] = data.charCodeAt(i);
        }

        return array;
    },
    Decode: (data: Uint8Array, idx: number = 0) => {
        var str = "";
        var length = Uint8.Decode(data, idx);

        for (var i = 0; i < length; i++) {
            str += String.fromCharCode(data[idx + 1 + i]);
        }

        return str;
    }
};

export const String16: Type<string> = {
    Length: (data: string) => {
        return 2 + data.length;
    },
    Encode: (data: string) => {
        var array = new Uint8Array(2 + data.length);
        array.set(Uint16.Encode(data.length), 0);

        for (var i = 0; i < data.length; i++) {
            array[i + 2] = data.charCodeAt(i);
        }

        return array;
    },
    Decode: (data: Uint8Array, idx: number = 0) => {
        var str = "";
        var length = Uint8.Decode(data, idx);

        for (var i = 0; i < length; i++) {
            str += String.fromCharCode(data[idx + 2 + i]);
        }

        return str;
    }
};

export const Int8: Type<number> = {
    Length: (data: number) => {
        return 1;
    },
    Encode: (data: number) => {
        if (!integerRange(data, 8, true)) throw new Error("out of bounds");
        return new Uint8Array([data + 128]);
    },
    Decode: (data: Uint8Array, idx: number = 0) => {
        return (data[idx] as number) - 128;
    }
};

export const Uint8: Type<number> = {
    Length: (data: number) => {
        return 1;
    },
    Encode: (data: number) => {
        if (!integerRange(data, 8, false)) throw new Error("out of bounds");
        return new Uint8Array([data]);
    },
    Decode: (data: Uint8Array, idx: number = 0) => {
        return data[idx] as number;
    }
};

export const Int16: Type<number> = {
    Length: (data: number) => {
        return 2;
    },
    Encode: (data: number) => {
        if (!integerRange(data, 16, true)) throw new Error("out of bounds");
        return new Uint8Array(convertToBase(data + 32768, 256, 2));
    },
    Decode: (data: Uint8Array, idx: number = 0) => {
        return convertFromBase(getSubArray(data, idx, 2), 256) - 32768;
    }
};

export const Uint16: Type<number> = {
    Length: (data: number) => {
        return 2;
    },
    Encode: (data: number) => {
        if (!integerRange(data, 16, false)) throw new Error("out of bounds");
        return new Uint8Array(convertToBase(data, 256, 2));
    },
    Decode: (data: Uint8Array, idx: number = 0) => {
        return convertFromBase(getSubArray(data, idx, 2), 256);
    }
};

export const Int32: Type<number> = {
    Length: (data: number) => {
        return 4;
    },
    Encode: (data: number) => {
        if (!integerRange(data, 32, true)) throw new Error("out of bounds");
        return new Uint8Array(convertToBase(data + 32768, 256, 4));
    },
    Decode: (data: Uint8Array, idx: number = 0) => {
        return convertFromBase(getSubArray(data, idx, 4), 256) - 32768;
    }
};

export const Uint32: Type<number> = {
    Length: (data: number) => {
        return 4;
    },
    Encode: (data: number) => {
        if (!integerRange(data, 32, false)) throw new Error("out of bounds");
        return new Uint8Array(convertToBase(data, 256, 4));
    },
    Decode: (data: Uint8Array, idx: number = 0) => {
        return convertFromBase(getSubArray(data, idx, 4), 256);
    }
};

var z = Int32.Encode(2147483647);
console.log(z, Int32.Decode(z));
