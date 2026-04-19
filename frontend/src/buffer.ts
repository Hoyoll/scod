import { editor, Uri } from "monaco-editor";

type EBuffer = Map<string, null | editor.ICodeEditorViewState>

export class ABuffer {
    private buffer: EBuffer = new Map()
    public register(key: string, value: string, ext: string) {
        editor.createModel(value, ext, Uri.file(key))
        this.buffer.set(key, null)
    }

    public set_vs(key: string, view_state: null | editor.ICodeEditorViewState) {
        this.buffer.set(key, view_state)
    }

    public delete(key: string) {
        this.buffer.delete(key)
    }

    public get_last(closure: Result<string, void>) {
        let a = Array.from(this.buffer)
        let ab = a.at(-1)
        if (ab) {
            closure.ok(ab[0])
        } else {
            closure.err()
        }
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
                view_state: ab
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
