import shutil
import zipfile  # Correct module for ZipFile
import os
import time
import argparse
from dotenv import load_dotenv
load_dotenv(dotenv_path='.env.local')

def make_archive_without_excluded_folder(source_folder, archive_name, exclude_folder=None):
    """Create a zip archive excluding a specific folder."""
    with zipfile.ZipFile(archive_name, 'w', zipfile.ZIP_DEFLATED) as archive:
        try:
            for root, dirs, files in os.walk(source_folder):
                # Skip the excluded folder and its subdirectories if specified
                if exclude_folder and exclude_folder in dirs:
                    dirs.remove(exclude_folder)
                for file in files:
                    file_path = os.path.join(root, file)
                    archive_path = os.path.relpath(file_path, source_folder)
                    archive.write(file_path, archive_path)
        except PermissionError as e:
            print(f"\033[91m[Permission Denied] Are you running Foundry VTT right now?\033[0m")
            print("\033[38;2;200;100;100m\033[2mTry running this same command with `--no-packs` to exclude the 'packs' folder, or close your FVTT World in order to build PACKS.\033[0m\n")
            exit(1)
try:
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Archive and update module folder")
    parser.add_argument("--no-archive", action="store_true", help="Skip archiving the current module folder")
    parser.add_argument("--no-packs", action="store_true", help="Skip copying the 'packs' folder (useful if your game is running and packs are LOCKED)")
    parser.add_argument("--server", type=str, help="Specify the server version (e.g., v12.343)")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    args = parser.parse_args()

    # Get the current folder and module name
    current_folder = os.path.dirname(os.path.abspath(__file__))
    module_name = os.path.basename(current_folder)

    # Get the target folder to update
    target_folder = os.path.join(os.getenv('FOUNDRY_DATA_PATH_BACKSLASHES'), "Data", "modules", module_name)
    if args.verbose:
        print(f"Target folder resolved to: {target_folder}")

    # Print the server version if provided
    if args.server:
        print(f"Server version specified: {args.server}")
        target_folder = os.path.join(os.getenv('NODE_SERVERS_PATH_BACKSLASHES'), f"{args.server}-data", "Data", "modules", module_name)
        if args.verbose:
            print(f"Updated target folder for server version: {target_folder}")

    # Archive (zip) the current target folder
    if not args.no_archive:
        archive_target = os.getenv('ARCHIVE_TARGET_PATH')
        if not archive_target:
            archive_target = os.path.join(current_folder, "archive", "foundry-modules_folder-archive", module_name + "-" + time.strftime("%Y-%m-%d--%H.%M.%S") + ".zip")
        else:
            archive_target = archive_target.format(
                module_name=module_name,
                timestamp=time.strftime("%Y-%m-%d--%H.%M.%S")
            )
        if args.verbose:
            print(f"Archiving {target_folder} to {archive_target} ...")
        make_archive_without_excluded_folder(target_folder, archive_target, "packs" if args.no_packs else None)
        print(f"Archived {target_folder} to {archive_target}.")

    # Update the target folder with the contents of the current dist folder
    dist_folder = os.path.join(current_folder, "dist")
    if args.verbose:
        print(f"Dist folder resolved to: {dist_folder}")

    for root, dirs, files in os.walk(dist_folder):
        if args.verbose:
            print(f"Processing directory: {root}")
        relative_root = os.path.relpath(root, dist_folder)
        target_root = os.path.join(target_folder, relative_root)
        if args.verbose:
            print(f"Target root resolved to: {target_root}")

        # Skip processing the excluded folder and its subdirectories if --no-packs is specified
        if args.no_packs and "packs" in dirs:
            print(f"Skipping excluded folder: packs")
            dirs.remove("packs")

        # Create directories if they don't exist
        try:
            if args.verbose:
                print(f"Creating target directory: {target_root}")
            os.makedirs(target_root, exist_ok=True)
        except Exception as e:
            print(f"Error creating directory {target_root}: {str(e)}")
            raise

        # Copy files
        for file in files:
            source_file = os.path.join(root, file)
            target_file = os.path.join(target_root, file)
            try:
                if args.verbose:
                    print(f"Copying file: {source_file} to {target_file}")
                shutil.copy2(source_file, target_file)
            except PermissionError as e:
                print(f"Permission denied while copying {source_file} to {target_file}. Skipping this file.")
            except Exception as e:
                print(f"Error copying file {source_file} to {target_file}: {str(e)}")
                raise

    print(f"Updated {target_folder} with the contents of the dist folder, excluding {'packs' if args.no_packs else 'nothing'}.")

except Exception as e:
    print(f"An error occurred: {str(e)}")
