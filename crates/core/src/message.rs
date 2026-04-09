use core::str;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Message {
    Buffer(Buffer),
    Pane(Pane),
    Editor(Editor),
    Event(Event),
    /// Like the name suggest, it will make it cross the rust <-> js boundary,
    /// Like Pane::Send but for the editor
    Json(String),
}

impl Message {
    pub fn into_json(&self) -> Message {
        Message::Json(serde_json::to_string(self).unwrap())
    }
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Event {
    BufferCreated(PathBuf),
    BufferSaved(PathBuf),
    BufferClosed(PathBuf),
    EditorReady,
    EditorClose,
    Custom(String),
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Editor {
    Focus,
    Maximize,
    FullScreen,
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Pane {
    Open {
        to: String,
    },
    Misc {
        to: String,
        action: Action,
    },
    Send {
        to: String,
        response: Want,
    },
    /// So you want to send "empty" Want which denode that it's a request
    /// and you will eventually received a "filled" Want
    Want {
        from: String,
        request: Want,
    },
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Want {
    Custom(String),
    Buffer(WBuffer),
}

#[derive(Deserialize, Serialize)]
pub enum WBuffer {
    Peek {
        text: Option<String>,
        path: String,
        line: Position<i32>,
        column: Position<i32>,
    },
    Copy {
        path: String,
        buffer: Option<String>,
    },
    Edit {
        text: String,
        path: String,
        line: Position<i32>,
        column: Position<i32>,
    },
}

#[derive(Deserialize, Serialize)]
pub enum Container<A, B> {
    Request(A),
    Response(B),
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Action {
    Focus,
    Hide,
    Close,
    ZoomIn,
    ZoomOut,
    Maximize,
    Resize { width: f64, height: f64 },
    Reposition { x: f64, y: f64 },
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Buffer {
    Dig { path: String, buffer: Payload },
    Error { path: String, error: String },
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Payload {
    /// Empty will dig the path turning itself into File or Dir
    Empty,
    /// It will write into the path
    File(String),
    Append(String),
    // It will have a bunch of path in said directory if the path given is a directory
    // Path(Vec<PathBuf>),
}

#[derive(Deserialize, Serialize)]
pub struct Position<T> {
    pub start: T,
    pub end: T,
}
