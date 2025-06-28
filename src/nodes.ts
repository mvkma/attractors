import { HasEval, BinaryFunc, ModParam, mods, UnaryFunc } from "./modulations"

function wrap(f: () => Generator<undefined, any, any>) {
    const gen = f()
    gen.next()
    return (x: any) => gen.next(x)
}

function move(element: HTMLElement, dx: number, dy: number) {
    const currAsNumber = (prop: string) => {
        const value = element.style.getPropertyValue(prop)
        return value === "" ? 0 : parseInt(value.slice(0, -2))
    }

    element.style.left = `${currAsNumber('left') + dx}px`
    element.style.top = `${currAsNumber('top') + dy}px`
}

function* dragHandler() {
    let event: DragEvent;

    while (event = yield) {
        if (event.type === 'dragstart') {
            console.log(event.clientX, event.clientY)
            const { clientX, clientY } = event

            while (event = yield) {
                if (event.type === 'dragend') {
                    const dx = event.clientX - clientX
                    const dy = event.clientY - clientY
                    console.log(event)
                    move(event.target as HTMLElement, dx, dy)
                    break
                }
            }
        }
    }
}

const onDrag = wrap(dragHandler)

function* dropHandler() {
    let event: DragEvent;
    while (event = yield) {
        if (event.type === 'dragenter' || event.type === 'dragover') {
            event.preventDefault()
        }

        if (event.type === 'dragleave') {
            console.log('leaving')
        }

        if (event.type === 'drop') {
            console.log('DROP')
        }
    }
}

const onDrop = wrap(dropHandler)

function* connectHandler() {
    let event: MouseEvent;

    while (event = yield) {
        const start = event.target as HTMLElement
        const isInput = start.classList.contains('input')
        start.classList.add('active')

        event = yield
        const end = event.target as HTMLElement

        if (isInput !== end.classList.contains('input') &&
            start.parentElement !== end.parentElement) {
            start.classList.toggle('connected')
            end.classList.toggle('connected')
            console.log(`connection ${start.parentElement?.textContent} - ${end.parentElement?.textContent}`)
        }

        start.classList.remove('active')
    }
}

const onClick = wrap(connectHandler)

export function box(title: string, n: number = 0) {
    const container = document.createElement('div')
    container.classList.add('draggable-box')
    container.draggable = true

    for (let i = 0; i < n; i++) {
        const input = document.createElement('span')
        input.classList.add('connector')
        input.classList.add('input')
        input.textContent = 'in'
        input.addEventListener('click', onClick)
        container.appendChild(input)
    }

    const output = document.createElement('span')
    output.classList.add('connector')
    output.classList.add('output')
    output.textContent = 'out'
    output.addEventListener('click', onClick)

    const label = document.createElement('span')
    label.classList.add('label')
    label.textContent = title

    container.appendChild(label)
    container.appendChild(output)

    container.addEventListener('dragstart', onDrag)
    container.addEventListener('drag', onDrag)
    container.addEventListener('dragend', onDrag)

    return container
}

///////////////////////////

export interface Node {
    name: string
    value: HasEval
    update: () => void
    parameters: { [k: string]: Node }
}

export function connect(parent: Node, other: Node, k: string) {
    other.parameters[k] = parent
    other.update()
}

export function disconnect(other: Node, k: string) {
    const oldParam = other.parameters[k]
    const newParam = constNode(oldParam.name, oldParam.value)
    other.parameters[k] = newParam
    other.update()
}

export function constNode(name: string, value: HasEval): Node {
    const node: Node = {
        name: name,
        value: value,
        update: () => {},
        parameters: {}
    }

    return node
}

export function unaryNode(name: string, func: UnaryFunc, x: Node) {
    const node: Node = {
        name: name,
        value: func(x.value),
        update() {
            this.parameters['x'].update()
            this.value = func(this.parameters['x'].value)
        },
        parameters: { x: x }
    }

    return node
}

export function binaryNode(name: string, func: BinaryFunc, a: Node, b: Node) {
    const node: Node = {
        name: name,
        value: func(a.value, b.value),
        update() {
            this.parameters['a'].update()
            this.parameters['b'].update()
            this.value = func(this.parameters['a'].value, this.parameters['b'].value)
        },
        parameters: { a: a, b: b }
    }

    return node
}

export function printTree(node: Node, level: number = 0) {
    const s = ''.padStart(level)
    console.log(s + `node: ${node.name}, value: ${node.value.eval()}`)
    for (const [k, param] of Object.entries(node.parameters)) {
        console.log(s + `- ${k}:`)
        printTree(param, level + 2)
    }
}

//////////////

export function renderNode(node: Node) {
    const n = Object.keys(node.parameters).length
    const container = box(node.name, n)

    return container
}
