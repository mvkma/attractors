import * as monaco from 'monaco-editor';

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { BinaryFuncKey, HasEval, mods, TernaryFuncKey, UnaryFuncKey } from './modulations';
import colormaps from './colormaps';
import { ColorMode } from './visualizers';

self.MonacoEnvironment = {
    getWorker(_, label) {
        if (label === 'json') {
            return new jsonWorker()
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
            return new cssWorker()
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
            return new htmlWorker()
        }
        if (label === 'typescript' || label === 'javascript') {
            return new tsWorker()
        }
        return new editorWorker()
    }
}

interface UnaryNode {
    f: UnaryFuncKey
    x: Node
}

interface BinaryNode {
    f: BinaryFuncKey
    x: Node
    y: Node
}

interface TernaryNode {
    f: TernaryFuncKey
    x: Node
    y: Node
    t: Node
}

type TimeNode = 'time'

export type Node = UnaryNode | BinaryNode | TernaryNode | TimeNode | number

export function buildModParam(m: ReturnType<typeof mods>, node: Node): HasEval {
    if (node === 'time') {
        return m.now
    }

    if (typeof node === 'number') {
        return m.constant({ a: node })
    }

    if ('t' in node) {
        return m.ternaryFuncs[node.f](buildModParam(m, node.x), buildModParam(m, node.y), buildModParam(m, node.t))
    } else if ('y' in node) {
        return m.binaryFuncs[node.f](buildModParam(m, node.x), buildModParam(m, node.y))
    } else {
        return m.unaryFuncs[node.f](buildModParam(m, node.x))
    }
}

const m = mods({ t: 0, dt: 0.01})

const nodeDefsSchema = {
    "Node": {
        oneOf: [
            { type: "number" },
            { $ref: "#/$defs/UnaryNode" },
            { $ref: "#/$defs/BinaryNode" },
            { $ref: "#/$defs/TernaryNode" },
            { $ref: "#/$defs/TimeNode" },
        ],
    },
    "UnaryNode": {
        type: "object",
        properties: {
            "f": {
                enum: Object.keys(m.unaryFuncs),
                description: "Unary function name"
            },
            "x": { $ref: "#/$defs/Node", description: "First argument" }
        },
        required: ["f", "x"],
        additionalProperties: false
    },
    "BinaryNode": {
        type: "object",
        properties: {
            "f": {
                enum: Object.keys(m.binaryFuncs),
                description: "Binary function name"
            },
            "x": { $ref: "#/$defs/Node", description: "First argument" },
            "y": { $ref: "#/$defs/Node", description: "Second argument" },
        },
        required: ["f", "x", "y"],
        additionalProperties: false
    },
    "TernaryNode": {
        type: "object",
        properties: {
            "f": {
                enum: Object.keys(m.ternaryFuncs),
                description: "Ternary function name"
            },
            "x": { $ref: "#/$defs/Node", description: "First argument" },
            "y": { $ref: "#/$defs/Node", description: "Second argument" },
            "t": { $ref: "#/$defs/Node", description: "Third argument" },
        },
        required: ["f", "x", "y", "t"],
        additionalProperties: false
    },
    "TimeNode": {
        "const": "time",
        "description": "Global time that increases with every frame."
    },
}

const modelParamsSchema = {
    type: "object",
    additionalProperties: { $ref: "#/$defs/Node" },
    $defs: nodeDefsSchema,
}

const viewParamsSchema = {
    type: "object",
    properties: {
        "color": {
            type: "object",
            properties: {
                "mode": {
                    enum: Object.keys(ColorMode),
                    description: "Color mode",
                },
                "map": {
                    enum: [...colormaps.keys()],
                    description: "Color map (only for colorMode 'velocity')",
                },
                "scale": {
                    $ref: "#/$defs/Node",
                    description: "Color scale (only for colorMode 'velocity')"
                },
            },
            additionalProperties: false,
        },
        "iterations": { $ref: "#/$defs/Node", description: "Timesteps per frame" },
        "scaleX": { $ref: "#/$defs/Node", description: "Scale in x-direction" },
        "scaleY": { $ref: "#/$defs/Node", description: "Scale in y-direction" },
        "scaleZ": { $ref: "#/$defs/Node", description: "Scale in z-direction" },
        "rotationX": { $ref: "#/$defs/Node", description: "Rotation around x-axis" },
        "rotationY": { $ref: "#/$defs/Node", description: "Rotation around y-axis" },
        "rotationZ": { $ref: "#/$defs/Node", description: "Rotation around z-axis" },
    },
    additionalProperties: { $ref: "#/$defs/Node" },
    $defs: nodeDefsSchema,
}

const origin = (new URL(window.location.href)).origin

monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    schemaValidation: 'error',
    schemas: [
        {
            uri: origin + '/modelParams.json',
            fileMatch: ['modelParams.json'],
            schema: modelParamsSchema,
        },
        {
            uri: origin + "/viewParams.json",
            fileMatch: ['viewParams.json'],
            schema: viewParamsSchema,
        },
    ]
})

export function newEditor(container: HTMLElement, callback: (json: string) => void, id: string, statusElement: HTMLElement) {
    const modelUri = monaco.Uri.parse(origin + `/${id}.json`)
    const model = monaco.editor.createModel("{}", "json", modelUri)

    const editor = monaco.editor.create(container, {
        model: model,
        theme: "vs-dark",
        lineNumbers: "off",
        minimap: {
            enabled: false
        },
        scrollbar: {
            useShadows: false,
        }
    });

    const setParams = (newParams: { [k: string]: Node }) => {
        const mod = editor.getModel()
        if (!mod) {
            return
        }

        mod.setValue(JSON.stringify(newParams, undefined, 2))
    }

    const getParams = () => model.getValue()

    editor.addAction({
        id: 'update-params',
        label: 'Update',
        keybindings: [
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        ],
        run: (ed) => {
            const markers = monaco.editor.getModelMarkers({ owner: 'json', resource: modelUri })
            if (markers.length > 0) {
                statusElement.textContent = `Error: ${markers[0].message}`
                statusElement.classList.remove('status-neutral')
                statusElement.classList.remove('status-success')
                statusElement.classList.add('status-failure')
                return undefined
            }
            const mod = ed.getModel()
            if (!mod) {
                return undefined
            }
            callback(mod.getValue())
            statusElement.textContent = `Success.`
            statusElement.classList.remove('status-neutral')
            statusElement.classList.remove('status-failure')
            statusElement.classList.add('status-success')
        }
    })

    return {
        setParams,
        getParams,
    }
}
