#!/usr/bin/env python3
"""
Helper script to create detailed fix requests for Copilot.
"""
import json
import sys
from pathlib import Path


def create_fix_request(error_report: str, pr_number: int, branch: str) -> dict:
    """
    Create a structured fix request for Copilot.
    """
    return {
        "title": f"[Auto-Fix] Fix test failures in PR #{pr_number}",
        "problem_statement": f"""
## Test Failures Report

{error_report}

## Context

- **PR:** #{pr_number}
- **Branch:** {branch}
- **Type:** Automated fix request

## Task

Please analyze the test failures above and:

1. Identify the root cause of each failure
2. Fix the issues in the appropriate files
3. Ensure all tests pass after the fix
4. Commit the changes to branch `{branch}`

## Expected Outcome

- All backend tests pass
- All security tests pass
- All frontend tests pass
- Code follows the existing patterns and conventions
""",
        "repository": "Gug-cyber/gestione-magazzino",
        "base_ref": branch
    }


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: create_copilot_fix_request.py <pr_number> <branch>", file=sys.stderr)
        print("Error report is read from stdin.", file=sys.stderr)
        sys.exit(1)

    try:
        pr_number = int(sys.argv[1])
    except ValueError:
        print(f"Error: pr_number must be an integer, got '{sys.argv[1]}'", file=sys.stderr)
        sys.exit(1)

    branch = sys.argv[2]
    error_report = sys.stdin.read()
    if not error_report.strip():
        print("Error: error report from stdin is empty.", file=sys.stderr)
        sys.exit(1)

    request = create_fix_request(error_report, pr_number, branch)
    print(json.dumps(request, indent=2))
