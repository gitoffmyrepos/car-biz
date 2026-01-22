#!/usr/bin/env python3
"""Validate YAML files in a directory."""
import sys
import os
import yaml

def validate_yaml_files(directory: str) -> bool:
    """Validate all YAML files in a directory."""
    valid = True
    for filename in sorted(os.listdir(directory)):
        if filename.endswith('.yaml') or filename.endswith('.yml'):
            filepath = os.path.join(directory, filename)
            try:
                with open(filepath, 'r') as f:
                    # Load all documents in multi-document YAML
                    list(yaml.safe_load_all(f))
                print(f"✅ {filename} - valid")
            except yaml.YAMLError as e:
                print(f"❌ {filename} - invalid: {e}")
                valid = False
            except Exception as e:
                print(f"❌ {filename} - error: {e}")
                valid = False
    return valid

if __name__ == "__main__":
    directory = sys.argv[1] if len(sys.argv) > 1 else "."
    if validate_yaml_files(directory):
        print("\nAll YAML files are valid!")
        sys.exit(0)
    else:
        print("\nSome YAML files have errors!")
        sys.exit(1)
