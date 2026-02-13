use std::env::{current_dir, current_exe};

use winit::{event_loop::EventLoop, window::WindowAttributes};

use crate::app::{App, Meta};
mod app;
fn main() {
    let mut attr = WindowAttributes::default();
    attr = attr.with_decorations(false);
    let event_loop = EventLoop::with_user_event().build().unwrap();
    let mut app = App {
        context: None,
        proxy: event_loop.create_proxy(),
        attr,
        meta: Meta {
            c_exe: current_exe().unwrap(),
            c_dir: current_dir().unwrap(),
        },
    };
    event_loop.run_app(&mut app);
}
