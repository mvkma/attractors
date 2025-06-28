export interface HasEval {
    eval: (t?: number) => number
}

export type ModParam = HasEval | number
export type BinaryFunc = (a: ModParam, b: ModParam) => HasEval
export type UnaryFunc = (a: ModParam) => HasEval

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
        'cos': Math.cos,
        'exp': Math.exp,
        'log': Math.log,
        'abs': Math.abs,
        'floor': Math.floor,
        'ceil': Math.ceil,
        'sinh': Math.sinh,
        'cosh': Math.cosh,
    }

    const ops: { [k: string]: BinaryFunc } = {}
    const funcs: { [k: string]: UnaryFunc } = {}

    for (const [k, func] of Object.entries(binaryOps)) {
        const f: BinaryFunc = (a, b) => {
            const aw = wrap(a)
            const bw = wrap(b)
            return {
                eval: (_t?: number) => func(aw.eval(), bw.eval())
            }
        }
        ops[k] = f
    }

    for (const [k, func] of Object.entries(unaryOps)) {
        const f: UnaryFunc = (a) => {
            const aw = wrap(a)
            return {
                eval: (_t?: number) => func(aw.eval())
            }
        }
        funcs[k] = f
    }

    return {
        setStep,
        setTime,
        tick,
        constant,
        now,
        funcs: funcs as { [k in keyof typeof unaryOps]: UnaryFunc },
        ops: ops as { [k in keyof typeof binaryOps]: BinaryFunc },
    }
}

