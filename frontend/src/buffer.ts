import { editor, Uri } from "monaco-editor"
import { MANUAL } from "./man"
import { Channel } from "./message_type"

type ActiveBuffer = {
    path: string,
    view_state: null | editor.ICodeEditorViewState    
    watched: boolean
}

type Result<T, A> = {
    ok: (value: T) => void
    err: (value: A) => void
}

type GapBuf<T> = {
    left: T[],
    right: T[]
}

export type Feeder = (model: editor.ITextModel, vs: null | editor.ICodeEditorViewState) => void 

class Buffer {
    private active_buffer: GapBuf<ActiveBuffer>
    private feeder: Feeder
    private channel: Channel
    constructor(feeder: Feeder, channel: Channel) {
        this.feeder = feeder
        this.channel = channel
        this.active_buffer = {
            left: [],
            right: []
        }
        this.register("shell.md", '', "markdown")
        this.register("man.md", MANUAL, "markdown")
        this.activate_current()
    }

    public find(key: string, closure: Result<void, void>) {
        let m = editor.getModel(Uri.file(key))
        if (m) {
            this.push_left()
            while (true) {
                if (this.active_buffer.left.at(-1).path === key) {
                    break
                }        
                this.shift_left()        
            }
        } else {
            closure.err()
        }
    }

    public register(key: string, value: string, ext: string) {
        editor.createModel(value, ext, Uri.file(key))
        this.active_buffer.left.push({
            path: key,
            view_state: null,
            watched: false
        })
        this.activate_current()
    }

    public activate_current() {
        let ok = this.active_buffer.left.at(-1)
        if (!ok) return
        this.feeder(editor.getModel(Uri.file(ok.path)), ok.view_state)        
    }

    public close_current() {
        this.shift_left()
        this.activate_current()
        this.active_buffer.right.pop()
    }

    public move_left(vs: null | editor.ICodeEditorViewState) {
        let ok = this.active_buffer.left.at(-1);
        if (!ok) return
        ok.view_state = vs
        this.shift_left()
        this.activate_current()
    }
    
    public move_right(vs: null | editor.ICodeEditorViewState) {
        let ok = this.active_buffer.right.at(-1);
        if (!ok) return
        ok.view_state = vs        
        this.shift_right()
        this.activate_current()
    }

    private push_left() {
        while (true) {
            let r = this.active_buffer.right.pop()
            if (r === undefined) {
                break
            }
            this.active_buffer.left.push(r)
        }
    }

    private push_right() {
        while (true) {
            let r = this.active_buffer.left.pop()
            if (r === undefined) {
                break
            }
            this.active_buffer.right.push(r)
        }
        this.shift_right()
    }

    private shift_left() {
        let item = this.active_buffer.left.pop()
        if (item === undefined) {
            this.push_left()
        } else {
            this.active_buffer.right.push(item)
        }
    }

    private shift_right() {
        let item = this.active_buffer.right.pop()
        if (item === undefined) {
            this.push_right()
        } else {
            this.active_buffer.left.push(item)
        }
    }
}
