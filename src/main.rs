use winit::{event_loop::EventLoop, window::WindowAttributes};

use crate::app::App;
mod app;
fn main() {
    let mut attr = WindowAttributes::default();
    attr = attr.with_decorations(false);
    let event_loop = EventLoop::with_user_event().build().unwrap();
    let mut app = App {
        context: None,
        proxy: event_loop.create_proxy(),
        attr,
    };
    event_loop.run_app(&mut app);
}
