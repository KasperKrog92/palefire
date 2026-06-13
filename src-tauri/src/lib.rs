use serde::Serialize;
use std::{fs, path::PathBuf};
use tauri::Manager;
use tauri_plugin_fs::FsExt;
use tauri_plugin_sql::{Migration, MigrationKind};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectPaths {
    data_dir: String,
    database_path: String,
    database_url: String,
}

fn project_data_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("src-tauri must live inside the repository")
        .join("data")
}

fn project_paths_value() -> ProjectPaths {
    let data_dir = project_data_dir();
    let database_path = data_dir.join("palefire.db");
    ProjectPaths {
        data_dir: data_dir.to_string_lossy().into_owned(),
        database_path: database_path.to_string_lossy().into_owned(),
        database_url: format!("sqlite:{}", database_path.to_string_lossy()),
    }
}

#[tauri::command]
fn project_paths() -> ProjectPaths {
    project_paths_value()
}

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
    let pcs: &'static str = Box::leak(
        include_str!("../migrations/002_player_characters.sql")
            .replace("\r\n", "\n")
            .into_boxed_str(),
    );
    let migrations = vec![
        Migration {
            version: 1,
            description: "initial_schema",
            sql: initial,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "player_characters",
            sql: pcs,
            kind: MigrationKind::Up,
        },
    ];
    let paths = project_paths_value();
    let data_dir = PathBuf::from(&paths.data_dir);
    fs::create_dir_all(data_dir.join("images")).expect("failed to create data/images");
    fs::create_dir_all(data_dir.join("audio")).expect("failed to create data/audio");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(&paths.database_url, migrations)
                .build(),
        )
        .setup(move |app| {
            app.fs_scope().allow_directory(&data_dir, true)?;
            app.asset_protocol_scope()
                .allow_directory(&data_dir, true)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![project_paths])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
