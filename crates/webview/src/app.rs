use scod_core::{
    alias::AList,
    client::Client,
    message::{Action, Buffer, Editor, Event, Message, Pane, Payload, Want},
};
use serde_json::from_str;
use std::{
    borrow::Cow,
    collections::HashMap,
    env,
    fs::{self, OpenOptions, read},
    io::Write,
    path::PathBuf,
    sync::mpsc::{self, Sender},
    thread::{self, JoinHandle},
};
use winit::{
    application::ApplicationHandler,
    event::{ElementState, KeyEvent, WindowEvent},
    event_loop::{ActiveEventLoop, EventLoopProxy},
    keyboard::{Key, NamedKey},
    window::{Window, WindowAttributes},
};
use wry::{
    WebView, WebViewBuilder,
    dpi::{LogicalPosition, LogicalSize, Size},
    http::{Request, Response, StatusCode},
};

const URL: &'static str = "scod://index.html";
const HEAD: &'static str = "scod";
fn protocol(_url: &str, req: Request<Vec<u8>>) -> Response<Cow<'static, [u8]>> {
    let uri = req.uri();
    let exe = env::current_exe().unwrap();
    // let body = req.body();
    // let body = req.into_body();
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

struct Proc {
    pub root: PathBuf,
}

impl Proc {
    pub fn serve(&self, req: Request<Vec<u8>>) -> Response<Cow<'static, [u8]>> {
        let uri = req.uri();
        let mut path = self.root.clone();
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
                for s in uri.path().split("/") {
                    if s == ".." {
                        continue;
                    }
                    path.push(s);
                }
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

fn buffer_handler(proxy: &EventLoopProxy<Message>, buffer: Buffer) {
    let send = |message: Message| {
        proxy.send_event(message.into_json());
    };
    match buffer {
        Buffer::Dig { path, buffer } => match buffer {
            Payload::Empty => {
                match fs::metadata(&path) {
                    Ok(meta) => match meta.is_dir() {
                        true => match fs::read_dir(&path) {
                            Ok(dir_entry) => {
                                let mut p = String::new();
                                for dir in dir_entry {
                                    p.push_str(dir.unwrap().path().to_str().unwrap());
                                    p.push_str("\n");
                                }
                                send(Message::Buffer(Buffer::Dig {
                                    path,
                                    buffer: Payload::File(p),
                                }));
                            }
                            Err(e) => send(Message::Buffer(Buffer::Error {
                                path,
                                error: e.to_string(),
                            })),
                        },
                        false => match fs::read_to_string(&path) {
                            Ok(buff) => send(Message::Buffer(Buffer::Dig {
                                path,
                                buffer: Payload::File(buff),
                            })),
                            Err(e) => {
                                let message = match e.kind() {
                                    std::io::ErrorKind::NotFound => Message::Buffer(Buffer::Dig {
                                        path,
                                        buffer: Payload::Empty,
                                    }),
                                    _ => Message::Buffer(Buffer::Error {
                                        path,
                                        error: e.to_string(),
                                    }),
                                };
                                send(message);
                            }
                        },
                    },
                    Err(e) => send(Message::Buffer(Buffer::Error {
                        path,
                        error: e.to_string(),
                    })),
                };
            }
            Payload::File(buff) => {
                fs::write(&path, buff);
                proxy.send_event(Message::Event(Event::BufferSaved(path)));
            }
            Payload::Append(s) => {
                let file = OpenOptions::new().append(true).create(true).open(path);
                if let Ok(mut f) = file {
                    write!(f, "{}", s);
                }
            }
        },
        _ => (),
    }
}

pub struct Context {
    pub window: Window,
    pub webview: WebView,
    pub scale: f64,
}

struct BufferIO {
    pub th: JoinHandle<()>,
    pub send: Sender<Buffer>,
}

pub struct App {
    pub context: Option<Context>,
    pub proxy: EventLoopProxy<Message>,
    pub attr: WindowAttributes,
    pub sub_context: HashMap<String, Context>,
    pub alist: AList,
    pub client: Client,
    pub buffer_io: Sender<Buffer>,
}

impl App {
    pub fn new(proxy: EventLoopProxy<Message>, attr: WindowAttributes) -> Self {
        let (send, recv) = mpsc::channel::<Buffer>();
        let prox = proxy.clone();
        thread::spawn(move || {
            while let Ok(buff) = recv.recv() {
                buffer_handler(&prox, buff);
            }
        });
        Self {
            context: None,
            proxy,
            attr,
            sub_context: HashMap::new(),
            alist: AList::new(),
            client: Client::new(),
            buffer_io: send,
        }
    }
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

    fn simple_send_to_js(&mut self, message: Message) {
        if let Some(context) = &mut self.context {
            if let Ok(json) = serde_json::to_string(&message) {
                context
                    .webview
                    .evaluate_script(&format!("window.Editor.receive({});", json));
            }
        }
    }
}

impl ApplicationHandler<Message> for App {
    fn resumed(&mut self, event_loop: &winit::event_loop::ActiveEventLoop) {
        self.create_context(event_loop);
    }

    fn window_event(
        &mut self,
        _event_loop: &winit::event_loop::ActiveEventLoop,
        _window_id: winit::window::WindowId,
        event: winit::event::WindowEvent,
    ) {
        match event {
            WindowEvent::KeyboardInput { event, .. } => match event {
                KeyEvent {
                    logical_key: Key::Named(NamedKey::Escape),
                    state: ElementState::Pressed,
                    ..
                } => {
                    // self.send_to_js(Message::Buffer(Buffer::Focus));
                }
                _ => (),
            },
            _ => (),
        }
    }

    fn user_event(&mut self, event_loop: &ActiveEventLoop, message: Message) {
        match message {
            Message::Buffer(buffer) => match buffer {
                Buffer::Dig { .. } => {
                    self.buffer_io.send(buffer);
                }
                Buffer::Error { .. } => {
                    self.simple_send_to_js(Message::Buffer(buffer));
                }
            },
            Message::Pane(pane) => match pane {
                Pane::Open { to } => {
                    let mut attr = self.attr.clone();
                    attr.visible = false;
                    let proxy = self.proxy.clone();
                    let webview_builder = WebViewBuilder::new().with_ipc_handler(move |request| {
                        from_str(request.body())
                            .map(|msg: Pane| proxy.send_event(Message::Pane(msg)));
                    });
                    let window = event_loop.create_window(attr).unwrap();
                    let mut root = self.client.mod_list.clone();
                    root.push(&to);
                    let proc = Proc { root };
                    let webview = webview_builder
                        .with_url(format!("{}://index.html", &to))
                        .with_custom_protocol(to.clone(), move |_url, request| proc.serve(request))
                        .build(&window)
                        .unwrap();
                    self.sub_context.insert(
                        to,
                        Context {
                            window,
                            webview,
                            scale: 1.0,
                        },
                    );
                }
                Pane::Misc { to, action } => {
                    if let Some(c) = self.sub_context.get_mut(&to) {
                        match action {
                            Action::Focus => {
                                c.window.set_visible(true);
                                c.webview.set_visible(true);
                                c.window.focus_window();
                            }
                            Action::Close => {
                                self.sub_context.remove(&to);
                            }
                            Action::ZoomIn => {
                                c.scale += 0.1;
                                c.webview.zoom(c.scale);
                            }
                            Action::ZoomOut => {
                                c.scale -= 0.1;
                                c.webview.zoom(c.scale);
                            }
                            Action::Resize { width, height } => {
                                c.window.request_inner_size(Size::Logical(LogicalSize::new(
                                    width, height,
                                )));
                            }
                            Action::Hide => {
                                c.webview.set_visible(false);
                                c.window.set_visible(false);
                            }
                            Action::Maximize => {
                                c.window.set_maximized(true);
                            }
                            Action::Reposition { x, y } => {
                                c.window.set_outer_position(LogicalPosition::new(x, y));
                            }
                        };
                    }
                }
                Pane::Send { to, response } => {
                    if let Some(context) = self.sub_context.get_mut(&to) {
                        serde_json::to_string(&response).map(|json| {
                            context
                                .webview
                                .evaluate_script(&format!("window.receive({});", json));
                        });
                    }
                }
            },
            Message::Json(json) => {
                if let Some(context) = &mut self.context {
                    context
                        .webview
                        .evaluate_script(&format!("window.Editor.receive({});", json));
                }
            }
            Message::Editor(editor) => {
                if let Some(context) = &mut self.context {
                    match editor {
                        Editor::Focus => {
                            context.window.focus_window();
                        }
                        Editor::Maximize => {
                            context.window.set_maximized(true);
                        }
                        Editor::FullScreen => {
                            context
                                .window
                                .set_fullscreen(Some(winit::window::Fullscreen::Borderless(None)));
                        }
                    }
                }
            }
            Message::Event(event) => {
                for (_, context) in &self.sub_context {
                    context.webview.evaluate_script(&format!(
                        "if (window.listen) {{
                    window.listen({});
                    }}",
                        serde_json::to_string(&event).unwrap()
                    ));
                }
            }
        }
    }
}
