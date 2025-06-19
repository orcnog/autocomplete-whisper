import shutil
import os
import time
import argparse
import json

try:
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Archive and update module folder")
    parser.add_argument("--no-archive", action="store_true", help="Skip archiving the current module folder")
    args = parser.parse_args()

    # Get the current folder and module name
    current_folder = os.path.dirname(os.path.abspath(__file__))
    module_name = os.path.basename(current_folder)

    # Load configuration from JSON file
    with open(os.path.join(current_folder, 'mod.config'), 'r') as file:
        config = json.load(file)

    # Retrieve paths from config file
    target_folder_base = os.path.normpath(config['target_folder_base'])
    target_folder = os.path.join(target_folder_base, module_name)

    print(f"Target folder base: {target_folder_base}") # Debug print
    print(f"Target folder: {target_folder}") # Debug print

    # Archive the current target folder
    if not args.no_archive and os.path.exists(target_folder):
        archive_target_base = os.path.normpath(os.path.join(current_folder, config['archive_target_base']))
        archive_target = os.path.join(archive_target_base, module_name + "-" + time.strftime("%Y-%m-%d--%H.%M.%S"))
        shutil.make_archive(archive_target, "zip", target_folder)
        print(f"Archived {target_folder} to {archive_target}.zip")

    # Update the target folder with the contents of the current dist folder
    if os.path.exists(target_folder):
        shutil.rmtree(target_folder)
    shutil.copytree(os.path.join(current_folder, "dist"), target_folder)
    print(f"Updated {target_folder} with the contents of the dist folder.")

except Exception as e:
    print(f"An error occurred: {str(e)}")
