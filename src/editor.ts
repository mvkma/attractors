import * as monaco from 'monaco-editor';

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { BinaryFuncKey, HasEval, mods, TernaryFuncKey, UnaryFuncKey } from './modulations';

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

monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    schemaValidation: 'error',
    schemas: [{
        uri: window.location.href + "mod-schema.json",
        fileMatch: ['*.json'],
        schema: {
            type: "object",
            additionalProperties: { $ref: "#/$defs/Node" },
            $defs: {
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
                            enum: Object.keys(m.unaryFuncs)
                        },
                        "x": { $ref: "#/$defs/Node" }
                    },
                    required: [ "f", "x" ],
                    additionalProperties: false
                },
                "BinaryNode": {
                    type: "object",
                    properties: {
                        "f": {
                            enum: Object.keys(m.binaryFuncs)
                        },
                        "x": { $ref: "#/$defs/Node" },
                        "y": { $ref: "#/$defs/Node" },
                    },
                    required: ["f", "x", "y"],
                    additionalProperties: false
                },
                "TernaryNode": {
                    type: "object",
                    properties: {
                        "f": {
                            enum: Object.keys(m.ternaryFuncs)
                        },
                        "x": { $ref: "#/$defs/Node" },
                        "y": { $ref: "#/$defs/Node" },
                        "t": { $ref: "#/$defs/Node" },
                    },
                    required: ["f", "x", "y", "t"],
                    additionalProperties: false
                },
                "TimeNode": { "const": "time" },
            }
        }
    }]
})

export function newEditor(container: HTMLElement, callback: (json: string) => void, id: string) {
    const modelUri = monaco.Uri.parse(window.location.href + `${id}.json`)
    const model = monaco.editor.createModel("{}", "json", modelUri)

    const editor = monaco.editor.create(container, {
        model: model,
        theme: "vs-dark",
        lineNumbers: "off",
        minimap: {
            enabled: false
        }
    });

    const setParams = (newParams: { [k: string]: Node }) => {
        model.setValue(JSON.stringify(newParams, undefined, 2))
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
                return undefined
            }
            const mod = ed.getModel()
            if (!mod) {
                return undefined
            }
            callback(mod.getValue())
        }
    })

    return {
        setParams,
        getParams,
    }
}
