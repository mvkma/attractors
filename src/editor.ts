import * as monaco from 'monaco-editor';

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { HasEval, mods } from './modulations';

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

const modelUri = monaco.Uri.parse(window.location.href + "mod.json")
const model = monaco.editor.createModel("{}", "json", modelUri)

type UnaryFunction = keyof ReturnType<typeof mods>['funcs']

interface UnaryNode {
    f: UnaryFunction
    x: Node
}

type BinaryFunction = keyof ReturnType<typeof mods>['ops']

interface BinaryNode {
    f: BinaryFunction
    x: Node
    y: Node
}

type TimeNode = 'time'

export type Node = UnaryNode | BinaryNode | TimeNode | number

export function buildModParam(m: ReturnType<typeof mods>, node: Node): HasEval {
    if (node === 'time') {
        return m.now
    }

    if (typeof node === 'number') {
        return m.constant({ a: node })
    }

    if ('y' in node) {
        return m.ops[node.f](buildModParam(m, node.x), buildModParam(m, node.y))
    } else {
        return m.funcs[node.f](buildModParam(m, node.x))
    }
}

const m = mods({ t: 0, dt: 0.01})

monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    schemaValidation: 'error',
    schemas: [{
        uri: window.location.href + "mod-schema.json",
        fileMatch: [modelUri.toString()],
        schema: {
            type: "object",
            additionalProperties: { $ref: "#/$defs/Node" },
            $defs: {
                "Node": {
                    oneOf: [
                        { type: "number" },
                        { $ref: "#/$defs/UnaryNode" },
                        { $ref: "#/$defs/BinaryNode" },
                        { $ref: "#/$defs/TimeNode" },
                    ],
                },
                "UnaryNode": {
                    type: "object",
                    properties: {
                        "f": {
                            enum: Object.keys(m.funcs)
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
                            enum: Object.keys(m.ops)
                        },
                        "x": { $ref: "#/$defs/Node" },
                        "y": { $ref: "#/$defs/Node" },
                    },
                    required: ["f", "x", "y"],
                    additionalProperties: false
                },
                "TimeNode": { "const": "time" },
            }
        }
    }]
})

export function newEditor(container: HTMLElement, callback: (json: string) => void) {

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

    editor.addCommand(
        monaco.KeyCode.Tab,
        () => {
            const markers = monaco.editor.getModelMarkers({ owner: 'json' })
            if (markers.length > 0) {
                return undefined
            }
            callback(model.getValue())
        }
    )

    return {
        setParams
    }
}
