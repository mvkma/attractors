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

interface UnaryNode {
    f: "sin" | "cos",
    x: Node
}

interface BinaryNode {
    f: "add" | "sub"
    x: Node
    y: Node
}

type TimeNode = 'time'

type Node = UnaryNode | BinaryNode | TimeNode | number

function buildModParam(m: ReturnType<typeof mods>, node: Node): HasEval {
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
                            enum: [ "sin", "cos" ]
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
                            enum: [ "add", "sub", "mul", "div" ],
                        },
                        "x": { $ref: "#/$defs/Node" },
                        "y": { $ref: "#/$defs/Node" },
                    },
                    required: [ "f", "x", "y" ],
                    additionalProperties: false
                },
                "TimeNode": { "const": "time" },
            }
        }
    }]
})

export function newEditor() {
    const container = document.createElement('div')
    container.classList.add('arena')
    document.body.appendChild(container)

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

    const getParams = (m: ReturnType<typeof mods>) => {
        const markers = monaco.editor.getModelMarkers({ owner: 'json' })
        if (markers.length > 0) {
            return undefined
        }

        const json = JSON.parse(model.getValue()) as { [k: string]: Node }
        const params: { [k: string]: HasEval } = {}

        for (const [key, node] of Object.entries(json)) {
            params[key] = buildModParam(m, node)
        }

        return params
    }

    editor.addCommand(
        monaco.KeyCode.Tab,
        () => {
            console.log(monaco.editor.getModelMarkers({ owner: 'json' }))
            console.log(monaco.editor.tokenize(model.getValue(), 'json'))
        }
    )

    return {
        setParams,
        getParams,
    }
}
