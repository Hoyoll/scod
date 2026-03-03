use serde::{Deserialize, Serialize};
use serde_json::{from_str, to_string};
use std::{
    borrow::Cow,
    env,
    fs::{self, read},
    io::{BufRead, BufReader, ErrorKind},
    path::{Path, PathBuf},
    process::{Command, Stdio},
    thread,
};
use winit::{
    application::ApplicationHandler,
    event::WindowEvent,
    event_loop::{ActiveEventLoop, EventLoopProxy},
    window::{Window, WindowAttributes},
};
use wry::{
    WebView, WebViewBuilder,
    http::{Request, Response, StatusCode},
};

const URL: &'static str = "scod://index.html";
const HEAD: &'static str = "scod";
fn protocol(_url: &str, req: Request<Vec<u8>>) -> Response<Cow<'static, [u8]>> {
    let uri = req.uri();
    let exe = env::current_exe().unwrap();
    let mut path = PathBuf::from(exe.parent().unwrap());
    let res = match uri.path() {
        "/" => {
            path.push("index.html");
            match read(path) {
                Ok(html) => Response::builder()
                    .status(StatusCode::OK)
                    .header("Content-Type", "text/html")
                    .body(Cow::Owned(html))
                    .unwrap(),
                Err(_) => Response::default(),
            }
        }
        _ => {
            uri.path().split("/").for_each(|s| {
                path.push(s);
            });
            match path.extension() {
                Some(ext) => {
                    let mime = mime_from_extension(ext.to_str().unwrap());
                    match read(path) {
                        Ok(b) => Response::builder()
                            .status(StatusCode::OK)
                            .header("Content-Type", mime)
                            .body(Cow::Owned(b))
                            .unwrap(),
                        Err(_) => Response::default(),
                    }
                }
                None => Response::default(),
            }
        }
    };
    res
}

fn mime_from_extension(ext: &str) -> &'static str {
    match ext {
        "html" => "text/html",
        "js" | "mjs" => "application/javascript",
        "css" => "text/css",
        "json" => "application/json",
        "wasm" => "application/wasm",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "ttf" => "font/ttf",
        "gif" => "image/gf",
        "ico" => "image/x-icon",
        "jpg" | "jpeg" => "image/jpeg",
        _ => "application/octet-stream",
    }
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Message {
    Window(Win),
    Buffer(Buffer),
    Module {
        key: String,
        data: String,
    },
    Port {
        key: String,
        data: String,
    },
    Alias(String),
    Command(String),
    Cursor(Cursor),
    #[serde(skip_serializing, skip_deserializing)]
    /// The String here IS a serialized Message!
    Eval(String),
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", rename_all = "UPPERCASE")]
pub enum Win {
    Ready,
    Close,
    ZoomIn,
    ZoomOut,
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Cursor {
    Move { line: i32, column: i32 },
    Jump { line: i32, column: i32 },
    Insert(String),
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Buffer {
    New {
        buffer: String,
        /// The PATH LOOKS like THIS: "path/to/file.txt"!
        path: String,
        ext: String,
    },
    /// To keep it simple, number == 0 WILL automatically resolve into the back of column/line
    Edit {
        text: String,
        path: String,
        line: Position<i32>,
        column: Position<i32>,
    },
    Write {
        buffer: String,
        path: String,
    },
    Open(String),
    Status(Result<String, String>),
    Focus,
    Close,
    Save(Save),
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "for", content = "path", rename_all = "UPPERCASE")]
pub enum Save {
    Current,
    Path(String),
}

#[derive(Deserialize, Serialize)]
pub struct Position<T> {
    pub start: T,
    pub end: T,
}

pub struct Context {
    pub window: Window,
    pub webview: WebView,
    pub scale: f64,
}

pub struct App {
    pub context: Option<Context>,
    pub proxy: EventLoopProxy<Message>,
    pub attr: WindowAttributes,
}

impl App {
    fn create_context(&mut self, event_loop: &ActiveEventLoop) {
        let mut attr = self.attr.clone();
        attr.visible = false;
        let proxy = self.proxy.clone();
        let webview_builder = WebViewBuilder::new().with_devtools(true).with_ipc_handler(
            move |m: wry::http::Request<String>| {
                if cfg!(debug_assertions) {
                    proxy.send_event(from_str(m.body()).unwrap());
                } else {
                    from_str(m.body()).map(|msg: Message| proxy.send_event(msg));
                }
            },
        );

        let window = event_loop.create_window(attr).unwrap();
        let webview = if cfg!(debug_assertions) {
            webview_builder
                .with_url("http://localhost:5173/")
                .build(&window)
                .unwrap()
        } else {
            webview_builder
                .with_url(URL)
                .with_custom_protocol(HEAD.into(), move |url, req| protocol(url, req))
                .build(&window)
                .unwrap()
        };
        self.context = Some(Context {
            window,
            webview,
            scale: 1.0,
        });
    }

    fn handle_message(&mut self, message: Message) {
        match message {
            Message::Window(win) => match win {
                Win::Ready => match &mut self.context {
                    Some(c) => {
                        c.window.set_visible(true);
                        c.webview.set_visible(true);
                        c.window.set_maximized(true);
                        c.window.focus_window();
                    }
                    None => (),
                },
                Win::Close => todo!(),
                Win::ZoomIn => {
                    if let Some(c) = &mut self.context {
                        c.scale += 0.1;
                        c.webview.zoom(c.scale);
                    }
                }
                Win::ZoomOut => {
                    if let Some(c) = &mut self.context {
                        c.scale -= 0.1;
                        c.webview.zoom(c.scale);
                    }
                }
            },
            Message::Buffer(buffer) => match buffer {
                Buffer::Write { buffer, path } => match fs::write(path, buffer) {
                    Ok(_) => {
                        println!("SAVED!")
                    }
                    Err(_) => {
                        println!("FILE PERMISSION ISSUE PROBABLY!")
                    }
                },
                Buffer::Open(p) => {
                    let proxy = self.proxy.clone();
                    thread::spawn(move || {
                        let path = Path::new(&p);
                        let ext = match path.extension() {
                            Some(e) => e.to_string_lossy().to_string(),
                            None => "".to_string(),
                        };
                        let buffer = match fs::read_to_string(path) {
                            Ok(value) => Message::Buffer(Buffer::New {
                                buffer: value,
                                path: p,
                                ext,
                            }),
                            Err(e) => match e.kind() {
                                ErrorKind::NotFound => Message::Buffer(Buffer::New {
                                    buffer: String::new(),
                                    path: p,
                                    ext,
                                }),
                                _ => Message::Buffer(Buffer::Status(Err(e.to_string()))),
                            },
                        };
                        to_string(&buffer).map(|json| proxy.send_event(Message::Eval(json)))
                    });
                }
                _ => (),
            },
            Message::Eval(s) => match &mut self.context {
                Some(c) => {
                    c.webview
                        .evaluate_script(&format!("window.Editor.receive({})", s));
                }
                None => (),
            },
            Message::Module { key, data } => match key.as_str() {
                "SHELL" => match shell_words::split(&data) {
                    Ok(cmd) => {
                        if cmd.is_empty() {
                            let msg = Message::Port {
                                key: "SHELL".to_string(),
                                data: "Error: Empty command!".to_string(),
                            };
                            to_string(&msg).map(|json| self.proxy.send_event(Message::Eval(json)));
                            return;
                        }
                        let mut c = Command::new(&cmd[0]);
                        for arg in &cmd[1..] {
                            c.arg(arg);
                        }
                        c.stdout(Stdio::piped());
                        c.stderr(Stdio::piped());
                        let proxy = self.proxy.clone();
                        thread::spawn(move || match c.spawn() {
                            Ok(mut child) => {
                                let id = child.id();
                                if let Some(stdout) = child.stdout.take() {
                                    let mut buf = BufReader::new(stdout);
                                    for line in buf.lines() {
                                        let msg = Message::Port {
                                            key: "SHELL".to_string(),
                                            data: format!("[PID: {}][OK]: {}", id, line.unwrap()),
                                        };
                                        to_string(&msg)
                                            .map(|json| proxy.send_event(Message::Eval(json)));
                                    }
                                }

                                if let Some(stderr) = child.stderr.take() {
                                    let mut buf = BufReader::new(stderr);
                                    for line in buf.lines() {
                                        let msg = Message::Port {
                                            key: "SHELL".to_string(),
                                            data: format!(
                                                "[PID: {}][ERROR]: {}",
                                                id,
                                                line.unwrap()
                                            ),
                                        };

                                        to_string(&msg)
                                            .map(|json| proxy.send_event(Message::Eval(json)));
                                    }
                                }
                            }
                            Err(e) => {
                                let msg = Message::Port {
                                    key: "SHELL".to_string(),
                                    data: format!(
                                        "Error Occured for command: [{}] {}",
                                        data,
                                        e.to_string()
                                    ),
                                };
                                to_string(&msg).map(|json| proxy.send_event(Message::Eval(json)));
                            }
                        });
                    }
                    Err(err) => {}
                },
                _ => (),
            },
            Message::Port { .. } => (),
            Message::Alias(_) => todo!(),
            Message::Command(_) => todo!(),
            Message::Cursor(_) => todo!(),
        }
    }

    fn handle_window_event(&self, event: WindowEvent, event_loop: &ActiveEventLoop) {
        // self.handle_window(event, event_loop);
    }
}

impl ApplicationHandler<Message> for App {
    fn resumed(&mut self, event_loop: &winit::event_loop::ActiveEventLoop) {
        self.create_context(event_loop);
    }

    fn window_event(
        &mut self,
        event_loop: &winit::event_loop::ActiveEventLoop,
        _window_id: winit::window::WindowId,
        event: winit::event::WindowEvent,
    ) {
        self.handle_window_event(event, event_loop)
    }

    fn user_event(&mut self, _event_loop: &ActiveEventLoop, message: Message) {
        self.handle_message(message)
    }
}
