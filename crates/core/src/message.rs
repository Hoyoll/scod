use core::str;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Message {
    Buffer(Buffer),
    Pane(Pane),
    Editor(Editor),
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
#[serde(rename_all = "UPPERCASE")]
pub enum Editor {
    Focus,
    Maximize,
    FullScreen,
}

// #[derive(Deserialize, Serialize)]
// #[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
// pub enum Module {
//     Open { to: String },
//     Wipe { to: String },
//     Send(Payload),
// }

// #[derive(Deserialize, Serialize)]
// pub struct Payload {
//     pub to: String,
//     pub from: String,
//     pub data: serde_json::Value,
// }

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

// #[derive(Deserialize, Serialize)]
// #[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
// pub enum Cursor {
//     Move { line: i32, column: i32 },
//     Jump { line: i32, column: i32 },
//     Clone { line: i32, column: i32 },
//     Insert(String),
// }

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Buffer {
    // New {
    //     /// The PATH LOOKS like THIS: "path/to/file.txt"!
    //     path: String,
    //     buffer: Option<String>,
    // },
    // /// To keep it simple, number == 0 WILL automatically resolve into the back of column/line
    // Edit {
    //     text: String,
    //     path: String,
    //     line: Position<i32>,
    //     column: Position<i32>,
    // },
    // Write {
    //     path: String,
    //     buffer: String,
    // },
    /// So if path: is None it will instead point to the current directory
    ///
    Dig {
        path: String,
        buffer: Payload,
    },
    Error {
        path: String,
        error: String,
    },
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Payload {
    /// Empty will dig the path turning itself into File or Dir
    Empty,
    /// It will write into the path
    File(String),
    /// It will have a bunch of path in said directory if the path given is a directory
    Dir(Vec<PathBuf>),
}
// #[derive(Deserialize, Serialize)]
// #[serde(tag = "for", content = "path", rename_all = "UPPERCASE")]
// pub enum Save {
//     Current,
//     Path(String),
// }

#[derive(Deserialize, Serialize)]
pub struct Position<T> {
    pub start: T,
    pub end: T,
}
