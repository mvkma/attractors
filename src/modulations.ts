export interface HasEval {
    eval: (t?: number) => number
}

export type ModParam = HasEval | number
export type TernaryFunc = (a: ModParam, b: ModParam, t: ModParam) => HasEval
export type BinaryFunc = (a: ModParam, b: ModParam) => HasEval
export type UnaryFunc = (a: ModParam) => HasEval

const binaryOps = {
    'add': (a: number, b: number) => a + b,
    'sub': (a: number, b: number) => a - b,
    'mul': (a: number, b: number) => a * b,
    'div': (a: number, b: number) => a / b,
    'min': (a: number, b: number) => Math.min(a, b),
    'max': (a: number, b: number) => Math.max(a, b),
    'pow': (a: number, b: number) => Math.pow(a, b),
}

const unaryOps = {
    'sin': Math.sin,
    'sin2': (a: number) => Math.pow(Math.sin(a), 2),
    'cos': Math.cos,
    'cos2': (a: number) => Math.pow(Math.cos(a), 2),
    'exp': Math.exp,
    'log': Math.log,
    'abs': Math.abs,
    'floor': Math.floor,
    'ceil': Math.ceil,
    'sinh': Math.sinh,
    'cosh': Math.cosh,
}

const ternaryOps = {
    'mix': (a: number, b: number, t: number) => a * (1 - t) + b * t
}

export type TernaryFuncKey = keyof typeof ternaryOps
export type BinaryFuncKey = keyof typeof binaryOps
export type UnaryFuncKey = keyof typeof unaryOps

export function mods({ t, dt }: { t: number, dt: number }) {
    let time = t
    let step = dt

    const setStep = (dt: number) => step = dt
    const setTime = (t: number) => time = t
    const tick = () => time += step

    const now: HasEval = {
        eval: (_t?: number) => t ? t : time
    }

    const constant = function ({ a }: { a: number }): HasEval {
        return {
            eval: (_t?: number) => a
        }
    }

    const wrap = (x: ModParam) => {
        return typeof (x) === 'number' ? constant({ a: x }) : x
    }


    const unaryFuncs: { [k: string]: UnaryFunc } = {}
    const binaryFuncs: { [k: string]: BinaryFunc } = {}
    const ternaryFuncs: { [k: string]: TernaryFunc } = {}

    for (const [k, func] of Object.entries(unaryOps)) {
        const f: UnaryFunc = (a) => {
            const aw = wrap(a)
            return {
                eval: (_t?: number) => func(aw.eval())
            }
        }
        unaryFuncs[k] = f
    }

    for (const [k, func] of Object.entries(binaryOps)) {
        const f: BinaryFunc = (a, b) => {
            const aw = wrap(a)
            const bw = wrap(b)
            return {
                eval: (_t?: number) => func(aw.eval(), bw.eval())
            }
        }
        binaryFuncs[k] = f
    }

    for (const [k, func] of Object.entries(ternaryOps)) {
        const f: TernaryFunc = (a, b, t) => {
            const aw = wrap(a)
            const bw = wrap(b)
            const tw = wrap(t)
            return {
                eval: (_t?: number) => func(aw.eval(), bw.eval(), tw.eval())
            }
        }
        ternaryFuncs[k] = f
    }

    return {
        setStep,
        setTime,
        tick,
        constant,
        now,
        unaryFuncs: unaryFuncs as { [k in UnaryFuncKey]: UnaryFunc },
        binaryFuncs: binaryFuncs as { [k in BinaryFuncKey]: BinaryFunc },
        ternaryFuncs: ternaryFuncs as { [k in TernaryFuncKey]: TernaryFunc },
    }
}

