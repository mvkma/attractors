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

type ParameterType = 'constant' | 'dynamic'

interface ConstantParameter {
    type: 'constant'
    name: string
    value: () => number
    min?: number
    max?: number
    step?: number
}

interface DynamicParameter {
    type: 'dynamic'
    name: string
    value: () => number
    parent: NewNode
}

type Parameter = ConstantParameter | DynamicParameter

interface NewNode {
    name: string
    value: number
    update: () => void
    parameters: { [k: string]: Parameter }
}

function newConnect(parent: NewNode, other: NewNode, k: string) {
    const oldParam = other.parameters[k]

    const newParam: Parameter = {
        type: 'dynamic',
        name: oldParam.name,
        value: () => {
            parent.update()
            return parent.value
        },
        parent: parent,
    }

    other.parameters[k] = newParam
    other.update()
}

function constNode(name: string, value: number): NewNode {
    const node: NewNode = {
        name: name,
        value: value,
        update: () => {},
        parameters: {}
    }

    return node
}

function additionNode(name: string): NewNode {
    const a: Parameter = {
        type: 'constant',
        name: 'a',
        value: () => 0
    }

    const b: Parameter = {
        type: 'constant',
        name: 'b',
        value: () => 0
    }

    const node: NewNode = {
        name: name,
        value: 0,
        update() {
            this.value = this.parameters['a'].value() + this.parameters['b'].value()
        },
        parameters: { a: a, b: b }
    }

    return node
}

export function box(title: string) {
    const container = document.createElement('div')
    container.classList.add('draggable-box')
    container.draggable = true

    const input = document.createElement('span')
    input.classList.add('connector')
    input.classList.add('input')
    input.textContent = 'in'
    input.addEventListener('click', onClick)

    const output = document.createElement('span')
    output.classList.add('connector')
    output.classList.add('output')
    output.textContent = 'out'
    output.addEventListener('click', onClick)

    const label = document.createElement('span')
    label.classList.add('label')
    label.textContent = title

    container.appendChild(input)
    container.appendChild(label)
    container.appendChild(output)

    container.addEventListener('dragstart', onDrag)
    container.addEventListener('drag', onDrag)
    container.addEventListener('dragend', onDrag)

    return container
}
