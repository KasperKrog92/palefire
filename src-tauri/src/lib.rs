use serde::{Deserialize, Serialize};
use std::{
    env, fs,
    path::{Path, PathBuf},
};
use tauri::ipc::Response;

const DATA_DIRECTORY_NAME: &str = "data";
const AUDIO_DIRECTORY_NAME: &str = "audio";
const STATE_FILE_NAME: &str = "palefire.json";
const MAX_AUDIO_FILE_SIZE: u64 = 250 * 1024 * 1024;
const AUDIO_EXTENSIONS: &[&str] = &["mp3", "wav", "ogg", "flac", "m4a", "aac"];
const WINDOWS_RESERVED_NAMES: &[&str] = &[
    "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
    "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct AudioLayer {
    id: String,
    name: String,
    file_path: String,
    volume: f32,
    enabled: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppState {
    version: u32,
    audio_layers: Vec<AudioLayer>,
}

#[derive(Debug, Serialize)]
struct ManagedAudioFile {
    name: String,
    path: String,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            version: 1,
            audio_layers: Vec::new(),
        }
    }
}

fn app_root() -> Result<PathBuf, String> {
    let executable =
        env::current_exe().map_err(|error| format!("Could not locate Palefire: {error}"))?;
    let executable_directory = executable
        .parent()
        .ok_or_else(|| "Palefire's executable has no parent directory.".to_string())?;

    for directory in executable_directory.ancestors() {
        if directory.join("package.json").is_file() && directory.join("src-tauri").is_dir() {
            return Ok(directory.to_path_buf());
        }
    }

    Ok(executable_directory.to_path_buf())
}

fn data_directory() -> Result<PathBuf, String> {
    Ok(app_root()?.join(DATA_DIRECTORY_NAME))
}

fn audio_directory() -> Result<PathBuf, String> {
    Ok(data_directory()?.join(AUDIO_DIRECTORY_NAME))
}

fn state_path() -> Result<PathBuf, String> {
    Ok(data_directory()?.join(STATE_FILE_NAME))
}

fn audio_extension(path: &Path) -> Result<String, String> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_lowercase)
        .ok_or_else(|| "The selected file has no supported extension.".to_string())?;

    if !AUDIO_EXTENSIONS.contains(&extension.as_str()) {
        return Err("The selected file type is not supported.".to_string());
    }

    Ok(extension)
}

fn validate_audio_source(path: &Path) -> Result<String, String> {
    let extension = audio_extension(path)?;
    let metadata =
        fs::metadata(path).map_err(|error| format!("Could not inspect the audio file: {error}"))?;

    if !metadata.is_file() {
        return Err("The selected path is not a file.".to_string());
    }
    if metadata.len() > MAX_AUDIO_FILE_SIZE {
        return Err("Audio files must be smaller than 250 MB.".to_string());
    }

    Ok(extension)
}

fn validate_file_stem(name: &str) -> Result<String, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("Enter a file name.".to_string());
    }
    if name.len() > 120 {
        return Err("File names must be 120 characters or fewer.".to_string());
    }
    if name.ends_with('.') || name.ends_with(' ') {
        return Err("File names cannot end with a dot or space.".to_string());
    }
    if name
        .chars()
        .any(|character| character.is_control() || r#"<>:"/\|?*"#.contains(character))
    {
        return Err("The file name contains a character Windows does not allow.".to_string());
    }
    let windows_base_name = name.split('.').next().unwrap_or(name);
    if WINDOWS_RESERVED_NAMES
        .iter()
        .any(|reserved| reserved.eq_ignore_ascii_case(windows_base_name))
    {
        return Err("That file name is reserved by Windows.".to_string());
    }

    Ok(name.to_string())
}

fn unique_destination(directory: &Path, stem: &str, extension: &str) -> PathBuf {
    let first_choice = directory.join(format!("{stem}.{extension}"));
    if !first_choice.exists() {
        return first_choice;
    }

    for number in 2.. {
        let candidate = directory.join(format!("{stem} ({number}).{extension}"));
        if !candidate.exists() {
            return candidate;
        }
    }

    unreachable!("a unique audio file name should always be available")
}

fn managed_file(path: PathBuf) -> Result<ManagedAudioFile, String> {
    let name = path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Could not read the managed audio file name.".to_string())?
        .to_string();

    let root = fs::canonicalize(app_root()?)
        .map_err(|error| format!("Could not locate Palefire's project folder: {error}"))?;
    let canonical_path = fs::canonicalize(path)
        .map_err(|error| format!("Could not locate the managed audio file: {error}"))?;
    let relative_path = canonical_path
        .strip_prefix(&root)
        .map_err(|_| "The audio file is outside Palefire's project folder.".to_string())?;

    Ok(ManagedAudioFile {
        name,
        path: relative_path.to_string_lossy().replace('\\', "/"),
    })
}

fn resolve_stored_path(path: &Path) -> Result<PathBuf, String> {
    if path.is_absolute() {
        return Ok(path.to_path_buf());
    }

    Ok(app_root()?.join(path))
}

fn ensure_managed_audio_path(path: &Path) -> Result<PathBuf, String> {
    let canonical_audio_directory = fs::canonicalize(audio_directory()?)
        .map_err(|error| format!("Could not locate Palefire's audio folder: {error}"))?;
    let resolved_path = resolve_stored_path(path)?;
    let canonical_path = fs::canonicalize(resolved_path)
        .map_err(|error| format!("Could not locate the audio file: {error}"))?;

    if !canonical_path.starts_with(canonical_audio_directory) {
        return Err("Palefire can only rename files in its managed audio folder.".to_string());
    }

    Ok(canonical_path)
}

#[tauri::command]
fn load_state() -> Result<AppState, String> {
    let path = state_path()?;
    if !path.exists() {
        return Ok(AppState::default());
    }

    let json =
        fs::read_to_string(&path).map_err(|error| format!("Could not read saved data: {error}"))?;
    serde_json::from_str(&json).map_err(|error| format!("Could not parse saved data: {error}"))
}

#[tauri::command]
fn save_state(state: AppState) -> Result<(), String> {
    let path = state_path()?;
    let directory = path
        .parent()
        .ok_or_else(|| "The project data path has no parent directory.".to_string())?;

    fs::create_dir_all(directory)
        .map_err(|error| format!("Could not create the project data directory: {error}"))?;

    let json = serde_json::to_string_pretty(&state)
        .map_err(|error| format!("Could not serialize app data: {error}"))?;
    fs::write(path, json).map_err(|error| format!("Could not save app data: {error}"))
}

#[tauri::command]
fn import_audio_files(paths: Vec<String>) -> Result<Vec<ManagedAudioFile>, String> {
    let destination_directory = audio_directory()?;
    fs::create_dir_all(&destination_directory)
        .map_err(|error| format!("Could not create Palefire's audio folder: {error}"))?;

    paths
        .into_iter()
        .map(|source| {
            let source = PathBuf::from(source);
            let extension = validate_audio_source(&source)?;
            let source_stem = source
                .file_stem()
                .and_then(|value| value.to_str())
                .ok_or_else(|| "Could not read the source file name.".to_string())?;
            let stem = validate_file_stem(source_stem)?;
            let destination = unique_destination(&destination_directory, &stem, &extension);

            fs::copy(&source, &destination)
                .map_err(|error| format!("Could not import the audio file: {error}"))?;
            managed_file(destination)
        })
        .collect()
}

#[tauri::command]
fn rename_audio_file(path: String, new_name: String) -> Result<ManagedAudioFile, String> {
    let source = ensure_managed_audio_path(Path::new(&path))?;
    let extension = audio_extension(&source)?;
    let extension_suffix = format!(".{extension}");
    let requested_stem = new_name
        .trim()
        .strip_suffix(&extension_suffix)
        .unwrap_or(new_name.trim());
    let stem = validate_file_stem(requested_stem)?;
    let destination = audio_directory()?.join(format!("{stem}.{extension}"));
    let source_name = source
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Could not read the current audio file name.".to_string())?;
    let destination_name = destination
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Could not create the new audio file name.".to_string())?;

    if source_name == destination_name {
        return managed_file(source);
    }
    if destination.exists() && !source_name.eq_ignore_ascii_case(destination_name) {
        return Err(format!(
            "An audio file named \"{stem}.{extension}\" already exists."
        ));
    }

    fs::rename(&source, &destination)
        .map_err(|error| format!("Could not rename the audio file: {error}"))?;
    managed_file(destination)
}

#[tauri::command]
fn read_audio_file(path: String) -> Result<Response, String> {
    let path = resolve_stored_path(Path::new(&path))?;
    validate_audio_source(&path)?;

    let bytes =
        fs::read(path).map_err(|error| format!("Could not read the audio file: {error}"))?;
    Ok(Response::new(bytes))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_state,
            save_state,
            import_audio_files,
            rename_audio_file,
            read_audio_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running Palefire");
}

#[cfg(test)]
mod tests {
    use super::{import_audio_files, rename_audio_file, resolve_stored_path, validate_file_stem};
    use std::{
        fs,
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn accepts_readable_file_names() {
        assert_eq!(validate_file_stem("Rainy Tavern").unwrap(), "Rainy Tavern");
    }

    #[test]
    fn rejects_windows_reserved_names() {
        assert!(validate_file_stem("CON").is_err());
    }

    #[test]
    fn rejects_windows_path_characters() {
        assert!(validate_file_stem("Rain / Thunder").is_err());
    }

    #[test]
    fn imports_and_renames_audio_in_the_project_data_folder() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let fixture_directory = std::env::temp_dir().join(format!("palefire-test-{unique}"));
        let fixture_path = fixture_directory.join("Storm Fixture.wav");
        fs::create_dir_all(&fixture_directory).unwrap();
        fs::write(&fixture_path, b"RIFFpalefire-test").unwrap();

        let imported =
            import_audio_files(vec![fixture_path.to_string_lossy().into_owned()]).unwrap();
        assert_eq!(imported.len(), 1);
        assert!(imported[0].path.starts_with("data/audio/"));

        let imported_path = resolve_stored_path(std::path::Path::new(&imported[0].path)).unwrap();
        assert!(imported_path.exists());

        let renamed =
            rename_audio_file(imported[0].path.clone(), format!("Renamed Storm {unique}")).unwrap();
        assert!(renamed.name.starts_with("Renamed Storm"));
        assert!(!imported_path.exists());

        let renamed_path = resolve_stored_path(std::path::Path::new(&renamed.path)).unwrap();
        assert!(renamed_path.exists());

        fs::remove_file(renamed_path).unwrap();
        fs::remove_dir_all(fixture_directory).unwrap();
    }
}
