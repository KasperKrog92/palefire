use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Normalize line endings so the migration checksum never depends on how
    // git checked the file out (CRLF would silently change the hash and
    // break databases that applied the LF version).
    let initial: &'static str = Box::leak(
        include_str!("../migrations/001_initial.sql")
            .replace("\r\n", "\n")
            .into_boxed_str(),
    );
    let migrations = vec![Migration {
        version: 1,
        description: "initial_schema",
        sql: initial,
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:palefire.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
