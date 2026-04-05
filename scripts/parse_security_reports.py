#!/usr/bin/env python3
"""
Parse security scan reports and create GitHub issue if vulnerabilities found.
"""
import json
import os
import sys
from pathlib import Path


def parse_safety_report(report_path):
    """Parse Safety (Python dependencies) report."""
    if not Path(report_path).exists():
        return []

    with open(report_path) as f:
        data = json.load(f)

    vulnerabilities = []
    # Safety report format: list of vulnerabilities or dict with 'vulnerabilities' key
    items = data if isinstance(data, list) else data.get("vulnerabilities", [])
    for vuln in items:
        vulnerabilities.append({
            "type": "Python Dependency",
            "package": vuln.get("package", "unknown"),
            "vulnerability": vuln.get("vulnerability", ""),
            "severity": vuln.get("severity", "unknown"),
            "fix": vuln.get("more_info_url", "")
        })

    return vulnerabilities


def parse_npm_audit(report_path):
    """Parse npm audit report."""
    if not Path(report_path).exists():
        return []

    with open(report_path) as f:
        data = json.load(f)

    vulnerabilities = []
    # npm audit v6 format uses 'advisories', v7+ uses 'vulnerabilities'
    advisories = data.get("advisories", {})
    for adv_id, adv in advisories.items():
        vulnerabilities.append({
            "type": "JavaScript Dependency",
            "package": adv.get("module_name", "unknown"),
            "vulnerability": adv.get("title", ""),
            "severity": adv.get("severity", "unknown"),
            "fix": adv.get("url", "")
        })

    # npm audit v7+ format
    if not advisories:
        for pkg_name, pkg_data in data.get("vulnerabilities", {}).items():
            severity = pkg_data.get("severity", "unknown")
            via = pkg_data.get("via", [])
            title = via[0].get("title", "") if via and isinstance(via[0], dict) else ""
            url = via[0].get("url", "") if via and isinstance(via[0], dict) else ""
            vulnerabilities.append({
                "type": "JavaScript Dependency",
                "package": pkg_name,
                "vulnerability": title,
                "severity": severity,
                "fix": url
            })

    return vulnerabilities


def parse_bandit_report(report_path):
    """Parse Bandit (Python code security) report."""
    if not Path(report_path).exists():
        return []

    with open(report_path) as f:
        data = json.load(f)

    vulnerabilities = []
    results = data.get("results", [])

    # Only include HIGH and MEDIUM severity to reduce noise
    for issue in results:
        if issue.get("issue_severity") in ["HIGH", "MEDIUM"]:
            vulnerabilities.append({
                "type": "Code Security",
                "file": issue.get("filename", ""),
                "line": issue.get("line_number", ""),
                "vulnerability": issue.get("issue_text", ""),
                "severity": issue.get("issue_severity", ""),
                "cwe": issue.get("issue_cwe", {}).get("id", "")
            })

    return vulnerabilities


def format_issue_body(vulnerabilities, pr_number, branch):
    """Format GitHub issue body with vulnerabilities."""
    if not vulnerabilities:
        return None

    body = f"""## 🔒 Security Vulnerabilities Detected

Security scans detected vulnerabilities in PR #{pr_number} (branch `{branch}`).

---

"""

    # Group by type
    dep_vulns = [v for v in vulnerabilities if v["type"] in ["Python Dependency", "JavaScript Dependency"]]
    code_vulns = [v for v in vulnerabilities if v["type"] == "Code Security"]

    if dep_vulns:
        body += "### 📦 Dependency Vulnerabilities\n\n"
        for vuln in dep_vulns:
            body += f"**{vuln['type']}**: `{vuln['package']}`\n"
            body += f"- **Severity**: {vuln['severity']}\n"
            body += f"- **Issue**: {vuln['vulnerability']}\n"
            if vuln.get('fix'):
                body += f"- **More info**: {vuln['fix']}\n"
            body += "\n"

    if code_vulns:
        body += "### 🐛 Code Security Issues\n\n"
        for vuln in code_vulns:
            body += f"**File**: `{vuln['file']}:{vuln['line']}`\n"
            body += f"- **Severity**: {vuln['severity']}\n"
            body += f"- **Issue**: {vuln['vulnerability']}\n"
            if vuln.get('cwe'):
                body += f"- **CWE**: {vuln['cwe']}\n"
            body += "\n"

    body += f"""---

**PR:** #{pr_number}
**Branch:** {branch}
**Commit:** {os.environ.get('GITHUB_SHA', 'unknown')}

@copilot Please analyze these security vulnerabilities and propose fixes. Once fixed, commit the changes to the branch.

The workflow will automatically re-scan after your fix.
"""

    return body


def main():
    # Paths to reports (downloaded by actions/download-artifact into security-reports/)
    safety_report = "security-reports/dependency-scan-reports/backend/safety-report.json"
    npm_report = "security-reports/dependency-scan-reports/frontend/npm-audit-report.json"
    bandit_report = "security-reports/bandit-report/bandit-report.json"

    # Parse all reports
    vulnerabilities = []
    vulnerabilities.extend(parse_safety_report(safety_report))
    vulnerabilities.extend(parse_npm_audit(npm_report))
    vulnerabilities.extend(parse_bandit_report(bandit_report))

    if not vulnerabilities:
        print("✅ No security vulnerabilities detected")
        sys.exit(0)

    # Get PR info from environment
    pr_number = os.environ.get("PR_NUMBER")
    branch = os.environ.get("HEAD_REF")

    if not pr_number or not branch:
        print("⚠️ Not a PR event, skipping issue creation")
        sys.exit(0)

    # Format issue body
    issue_body = format_issue_body(vulnerabilities, pr_number, branch)

    if not issue_body:
        sys.exit(0)

    # Output for GitHub Actions
    print(f"Found {len(vulnerabilities)} vulnerabilities")

    # Write to file for next step
    with open("security-issue-body.md", "w") as f:
        f.write(issue_body)

    # Write summary for PR comment
    summary = (
        f"🔒 **Security Scan Results**: {len(vulnerabilities)} vulnerabilities detected. "
        f"See the created issue for details."
    )
    with open("security-summary.md", "w") as f:
        f.write(summary)


if __name__ == "__main__":
    main()
