import * as monaco from 'monaco-editor';

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

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
                            enum: [ "+", "-" ],
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

    monaco.editor.create(container, {
        model: model,
        theme: "vs-dark",
        lineNumbers: "off",
        minimap: {
            enabled: false
        }
    });
}
