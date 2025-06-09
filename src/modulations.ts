export interface HasEval {
    eval: (t?: number) => number
}

export function mods({ t, dt }: { t: number, dt: number }) {
    let time = t
    let step = dt

    const setStep = (dt: number) => step = dt
    const setTime = (t: number) => time = t
    const tick = () => time += step

    const constant = function({ a }: { a: number }): HasEval {
        return {
            eval: (_t?: number) => a
        }
    }

    const linear = function({ a, b }: { a: HasEval, b: HasEval }): HasEval {
        return {
            eval: (t?: number) => t ? a.eval(t) * t + b.eval(t) : a.eval() * time + b.eval()
        }
    }

    const sin = function({ freq, phi }: { freq: HasEval, phi: HasEval }): HasEval {
        return {
            eval: (t?: number) => t ? Math.sin(freq.eval() * t + phi.eval()) : Math.sin(freq.eval() * time + phi.eval())
        }
    }

    const mul = function({ a, b }: { a: HasEval, b: HasEval }): HasEval {
        return {
            eval: (t?: number) => t ? a.eval(t) * b.eval(t) : a.eval(time) * b.eval(time)
        }
    }

    const add = function({ a, b }: { a: HasEval, b: HasEval }): HasEval {
        return {
            eval: (t?: number) => t ? a.eval(t) + b.eval(t) : a.eval(time) + b.eval(time)
        }
    }

    return {
        setStep,
        setTime,
        tick,
        constant,
        linear,
        sin,
        mul,
        add,
    }
}

