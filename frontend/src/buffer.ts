import { editor, Uri } from "monaco-editor"

type EBuffer = Map<string, {
    view_state: null | editor.ICodeEditorViewState,
    watched: boolean
}>

export class ABuffer {
    private buffer: EBuffer = new Map()
    public register(key: string, value: string, ext: string) {
        editor.createModel(value, ext, Uri.file(key))
        this.buffer.set(key, {
            view_state: null,
            watched: false
        })
    }

    public set_vs(key: string, view_state: null | editor.ICodeEditorViewState) {
        let b = this.buffer.get(key)
        if (b) {
            b.view_state = view_state
        }
    }

    public delete(key: string) {

    }

    public find(key: string, closure: Result<{
        model: editor.ITextModel,
        view_state: null | editor.ICodeEditorViewState
    }, void>) {
        let ab = this.buffer.get(key);
        if (ab) {
            let model = editor.getModel(Uri.file(key))!;
            closure.ok({
                model: model,
                view_state: ab.view_state
            })
        } else {
            closure.err()
        }
    }
}

type Result<T, A> = {
    ok: (value: T) => void
    err: (value: A) => void
}