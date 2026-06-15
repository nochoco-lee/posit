# /// script
# requires-python = ">=3.9"
# dependencies = [
#     "requests",
# ]
# ///

import sys
import re
import requests

def main():
    if len(sys.argv) != 2:
        print("Usage: uv run extract_puml.py <url>")
        sys.exit(1)

    url = sys.argv[1]
    try:
        print(f"Fetching content from {url}...")
        response = requests.get(url)
        response.raise_for_status()
    except Exception as e:
        print(f"Failed to fetch url: {e}")
        sys.exit(1)

    text = response.text
    
    # Non-greedy match for PlantUML blocks, taking newlines into account
    pattern = re.compile(r'(@startuml.*?@enduml)', re.DOTALL | re.IGNORECASE)
    matches = pattern.findall(text)

    if not matches:
        print(f"No PlantUML scripts found at {url}")
        sys.exit(0)

    print(f"Found {len(matches)} PlantUML script(s).")

    for i, script_content in enumerate(matches, 1):
        filename = f"diagram_{i}.puml"
        with open(filename, "w", encoding="utf-8") as f:
            f.write(script_content)
        print(f"Saved {filename}")

if __name__ == "__main__":
    main()
