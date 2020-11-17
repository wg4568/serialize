function convertToBase(val: number, base: number, length?: number): number[] {
    if (val == 0 && length) new Array(length).fill(0);
    else if (val == 0) return [0];

    var result: number[] = [];

    while (val > 0) {
        let rem = val % base;
        result.push(rem);
        val = Math.floor(val / base);
    }

    if (length) {
        if (result.length > length)
            throw new OutOfBoundsError(
                `${val} out of range for array of size ${length}`
            );
        while (result.length < length) result.push(0);
    }

    return result.reverse();
}

function convertFromBase(val: number[], base: number): number {
    var result = 0;
    var backwards = val.slice().reverse(); // prevent mutation of val

    for (var i = 0; i < val.length; i++) {
        let place = Math.pow(base, i);
        result += backwards[i] * place;
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
    return val < max && val >= min;
}

function binaryToBytes(binary: Binary): Uint8Array {
    if (binary.length % 8 != 0)
        throw new ValidationError("binary length must be of multiple of 8");

    var length = binary.length / 8;
    var array = new Uint8Array(length);

    for (var i = 0; i < length; i++) {
        let total = 0;
        for (var j = 0; j < 8; j++)
            if (binary[i * 8 + j]) total += Math.pow(2, j);
        array.set(new Uint8Array([total]), i);
    }

    return array;
}

function bytesToBinary(data: Uint8Array): Binary {
    var array: Binary = [];

    for (var i = 0; i < data.length; i++) {
        let val = data[i];
        for (var j = 0; j < 8; j++) {
            if (val & Math.pow(2, j)) array.push(1);
            else array.push(0);
        }
    }

    return array;
}

function getFractionBits(val: number, n: number) {
    var result: Binary = [];
    var counter = seperateDecimal(val).decimal;
    while (result.length <= n) {
        counter *= 2;
        let { base, decimal } = seperateDecimal(counter);
        result.push(base as Bit);
        counter = decimal;
    }

    return result;
}

function getSubArray(data: Uint8Array, idx: number, length: number): number[] {
    return Array.from(data.subarray(idx, idx + length));
}

function seperateDecimal(val: number): { base: number; decimal: number } {
    var base = Math.floor(val);
    var decimal = val - base;
    return { base, decimal };
}

function encodeFloat(
    val: number,
    exponentSize: number,
    fractionSize: number,
    bias: number
) {
    var sign: Bit = val < 0 ? 1 : 0;

    var array: Binary = [];
    var { base } = seperateDecimal(val);

    var left = convertToBase(base, 2) as Binary;
    var right = getFractionBits(val, fractionSize * 2);
    var joined = [...left, ...right];

    for (var i = 0; i < joined.length; i++) if (joined[i] != 0) break;

    // handle zero
    if (i == joined.length) {
        var exponent = convertToBase(0, 2, exponentSize);
        i = 0;
    } else {
        var exponent = convertToBase(
            left.length - i - 1 + bias,
            2,
            exponentSize
        );
    }

    var fraction = joined.slice(i + 1, i + 1 + fractionSize);
    return binaryToBytes([sign, ...(exponent as Binary), ...fraction]);
}

function decodeFloat(
    val: Uint8Array,
    exponentSize: number,
    fractionSize: number,
    bias: number
): number {
    var binary = bytesToBinary(val);
    var sign = binary[0] == 1 ? -1 : 1;
    var exponent = convertFromBase(binary.slice(1, 1 + exponentSize), 2) - bias;
    var fraction =
        binary
            .slice(1 + exponentSize, 1 + exponentSize + fractionSize)
            .map((b, i) => b * Math.pow(2, -i - 1))
            .reduce((a, b) => a + b) + 1;

    return fraction * Math.pow(2, exponent) * sign;
}

class OutOfBoundsError extends Error {
    constructor(msg: string = "") {
        super("[Out of Bounds] " + msg);
    }
}

class ValidationError extends Error {
    constructor(msg: string = "") {
        super("[Validation Error] " + msg);
    }
}

type Type<Data> = {
    Length: (data: Data) => number;
    Validate: (data: Uint8Array, idx?: number) => boolean;
    Encode: (data: Data) => Uint8Array;
    Decode: (data: Uint8Array, idx?: number) => Data;
};

type Bit = 1 | 0;
type Binary = Bit[];

export const String8: Type<string> = {
    Length: (data: string) => {
        return 1 + data.length;
    },
    Validate: (data: Uint8Array, idx: number = 0) => {
        if (data.length - idx < 1) return false;
        if (data.length - idx - 1 < Uint8.Decode(data, idx)) return false;
        return true;
    },
    Encode: (data: string) => {
        var array = new Uint8Array(1 + data.length);

        try {
            array.set(Uint8.Encode(data.length), 0);
        } catch (err) {
            if (err instanceof OutOfBoundsError)
                throw new OutOfBoundsError(
                    "length exceeds maximum for String8"
                );
        }

        for (var i = 0; i < data.length; i++) {
            array[i + 1] = data.charCodeAt(i);
        }

        return array;
    },
    Decode: (data: Uint8Array, idx: number = 0) => {
        if (!String8.Validate(data, idx)) throw new ValidationError();

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
    Validate: (data: Uint8Array, idx: number = 0) => {
        if (data.length - idx < 2) return false;
        if (data.length - idx - 2 < Uint16.Decode(data, idx)) return false;
        return true;
    },
    Encode: (data: string) => {
        var array = new Uint8Array(2 + data.length);

        try {
            array.set(Uint16.Encode(data.length), 0);
        } catch (err) {
            if (err instanceof OutOfBoundsError)
                throw new OutOfBoundsError(
                    "length exceeds maximum for String16"
                );
        }

        for (var i = 0; i < data.length; i++) {
            array[i + 2] = data.charCodeAt(i);
        }

        return array;
    },
    Decode: (data: Uint8Array, idx: number = 0) => {
        if (!String16.Validate(data, idx)) throw new ValidationError();

        var str = "";
        var length = Uint8.Decode(data, idx);

        for (var i = 0; i < length; i++) {
            str += String.fromCharCode(data[idx + 2 + i]);
        }

        return str;
    }
};

export const Raw8: Type<Uint8Array> = {
    Length: (data: Uint8Array) => {
        return 1 + data.length;
    },
    Validate: (data: Uint8Array, idx: number = 0) => {
        if (data.length - idx < 1) return false;
        if (data.length - idx - 1 < Uint8.Decode(data, idx)) return false;
        return true;
    },
    Encode: (data: Uint8Array) => {
        var array = new Uint8Array(1 + data.length);

        try {
            array.set(Uint8.Encode(data.length), 0);
        } catch (err) {
            if (err instanceof OutOfBoundsError)
                throw new OutOfBoundsError("length exceeds maximum for Raw8");
        }

        array.set(data, 1);
        return array;
    },
    Decode: (data: Uint8Array, idx: number = 0) => {
        if (!Raw8.Validate(data, idx)) throw new ValidationError();

        var length = Uint8.Decode(data, idx);
        return data.subarray(1, 1 + length);
    }
};

export const Raw16: Type<Uint8Array> = {
    Length: (data: Uint8Array) => {
        return 2 + data.length;
    },
    Validate: (data: Uint8Array, idx: number = 0) => {
        if (data.length - idx < 2) return false;
        if (data.length - idx - 2 < Uint8.Decode(data, idx)) return false;
        return true;
    },
    Encode: (data: Uint8Array) => {
        var array = new Uint8Array(2 + data.length);

        try {
            array.set(Uint8.Encode(data.length), 0);
        } catch (err) {
            if (err instanceof OutOfBoundsError)
                throw new OutOfBoundsError("length exceeds maximum for Raw16");
        }

        array.set(data, 2);
        return array;
    },
    Decode: (data: Uint8Array, idx: number = 0) => {
        if (!Raw8.Validate(data, idx)) throw new ValidationError();

        var length = Uint8.Decode(data, idx);
        return data.subarray(2, 2 + length);
    }
};

export const Int8: Type<number> = {
    Length: (data: number) => {
        return 1;
    },
    Validate: (data: Uint8Array, idx: number = 0) => {
        return data.length - idx >= 1;
    },
    Encode: (data: number) => {
        if (!integerRange(data, 8, true))
            throw new OutOfBoundsError(`${data} out of range for Int8`);
        return new Uint8Array([data + 128]);
    },
    Decode: (data: Uint8Array, idx: number = 0) => {
        if (!Int8.Validate(data, idx)) throw new ValidationError();

        return (data[idx] as number) - 128;
    }
};

export const Uint8: Type<number> = {
    Length: (data: number) => {
        return 1;
    },
    Validate: (data: Uint8Array, idx: number = 0) => {
        return data.length - idx >= 1;
    },
    Encode: (data: number) => {
        if (!integerRange(data, 8, false))
            throw new OutOfBoundsError(`${data} out of range for Uint8`);
        return new Uint8Array([data]);
    },
    Decode: (data: Uint8Array, idx: number = 0) => {
        if (!Uint8.Validate(data, idx)) throw new ValidationError();

        return data[idx] as number;
    }
};

export const Int16: Type<number> = {
    Length: (data: number) => {
        return 2;
    },
    Validate: (data: Uint8Array, idx: number = 0) => {
        return data.length - idx >= 2;
    },
    Encode: (data: number) => {
        if (!integerRange(data, 16, true))
            throw new OutOfBoundsError(`${data} out of range for Int16`);
        return new Uint8Array(convertToBase(data + 32768, 256, 2));
    },
    Decode: (data: Uint8Array, idx: number = 0) => {
        if (!Int16.Validate(data, idx)) throw new ValidationError();

        return convertFromBase(getSubArray(data, idx, 2), 256) - 32768;
    }
};

export const Uint16: Type<number> = {
    Length: (data: number) => {
        return 2;
    },
    Validate: (data: Uint8Array, idx: number = 0) => {
        return data.length - idx >= 2;
    },
    Encode: (data: number) => {
        if (!integerRange(data, 16, false))
            throw new OutOfBoundsError(`${data} out of range for Uint16`);
        return new Uint8Array(convertToBase(data, 256, 2));
    },
    Decode: (data: Uint8Array, idx: number = 0) => {
        if (!Uint16.Validate(data, idx)) throw new ValidationError();

        return convertFromBase(getSubArray(data, idx, 2), 256);
    }
};

export const Int32: Type<number> = {
    Length: (data: number) => {
        return 4;
    },
    Validate: (data: Uint8Array, idx: number = 0) => {
        return data.length - idx >= 4;
    },
    Encode: (data: number) => {
        if (!integerRange(data, 32, true))
            throw new OutOfBoundsError(`${data} out of range for Int32`);
        return new Uint8Array(convertToBase(data + 32768, 256, 4));
    },
    Decode: (data: Uint8Array, idx: number = 0) => {
        if (!Int32.Validate(data, idx)) throw new ValidationError();

        return convertFromBase(getSubArray(data, idx, 4), 256) - 32768;
    }
};

export const Uint32: Type<number> = {
    Length: (data: number) => {
        return 4;
    },
    Validate: (data: Uint8Array, idx: number = 0) => {
        return data.length - idx >= 4;
    },
    Encode: (data: number) => {
        if (!integerRange(data, 32, false))
            throw new OutOfBoundsError(`${data} out of range for Uint32`);
        return new Uint8Array(convertToBase(data, 256, 4));
    },
    Decode: (data: Uint8Array, idx: number = 0) => {
        if (!Uint32.Validate(data, idx)) throw new ValidationError();

        return convertFromBase(getSubArray(data, idx, 4), 256);
    }
};

export const Float: Type<number> = {
    Length: (data: number) => {
        return 4;
    },
    Validate: (data: Uint8Array, idx: number = 0) => {
        return data.length - idx >= 4;
    },
    Encode: (data: number) => {
        return encodeFloat(data, 8, 23, 127);
    },
    Decode: (data: Uint8Array, idx: number = 0) => {
        if (!Uint32.Validate(data, idx)) throw new ValidationError();

        return decodeFloat(data.subarray(idx, idx + 4), 8, 23, 127);
    }
};

export const Double: Type<number> = {
    Length: (data: number) => {
        return 8;
    },
    Validate: (data: Uint8Array, idx: number = 0) => {
        return data.length - idx >= 8;
    },
    Encode: (data: number) => {
        return encodeFloat(data, 11, 52, 1023);
    },
    Decode: (data: Uint8Array, idx: number = 0) => {
        if (!Uint32.Validate(data, idx)) throw new ValidationError();

        return decodeFloat(data.subarray(idx, idx + 8), 11, 52, 1023);
    }
};
