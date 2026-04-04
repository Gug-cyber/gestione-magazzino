#!/usr/bin/env python3
"""
Security Testing Bot
Esegue automaticamente test di sicurezza e genera report.
"""

import subprocess
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List


class SecurityBot:
    def __init__(self):
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "tests": [],
            "summary": {
                "total": 0,
                "passed": 0,
                "failed": 0,
                "warnings": 0,
            },
        }
        self.repo_root = Path(__file__).parent.parent

    def run_command(self, cmd: List[str], cwd: Path = None) -> subprocess.CompletedProcess:
        """Esegue un comando e cattura l'output."""
        return subprocess.run(
            cmd,
            cwd=cwd or self.repo_root,
            capture_output=True,
            text=True,
        )

    def run_unit_tests(self):
        """Esegue i test unitari."""
        print("🧪 Running unit tests...")

        result = self.run_command(
            ["pytest", "backend/tests/", "-q"],
            cwd=self.repo_root,
        )

        status = "passed" if result.returncode == 0 else "failed"
        self.results["tests"].append(
            {
                "name": "Unit Tests",
                "type": "functional",
                "status": status,
                "returncode": result.returncode,
            }
        )

        if status == "passed":
            self.results["summary"]["passed"] += 1
        else:
            self.results["summary"]["failed"] += 1

        print(f"   {'✓' if status == 'passed' else '✗'} Unit tests {status}")

    def scan_python_dependencies(self):
        """Scansiona dipendenze Python per vulnerabilità."""
        print("🔍 Scanning Python dependencies...")

        report_path = self.repo_root / "backend" / "safety-report.json"
        result = self.run_command(
            ["safety", "check", "--json", "--output", str(report_path)],
            cwd=self.repo_root / "backend",
        )

        try:
            with open(report_path) as f:
                safety_data = json.load(f)

            vulnerabilities = safety_data.get("vulnerabilities", [])
            status = "passed" if len(vulnerabilities) == 0 else "failed"

            self.results["tests"].append(
                {
                    "name": "Python Dependency Scan",
                    "type": "dependency_scan",
                    "status": status,
                    "vulnerabilities_found": len(vulnerabilities),
                }
            )

            if status == "passed":
                self.results["summary"]["passed"] += 1
            else:
                self.results["summary"]["warnings"] += 1

            print(f"   {'✓' if status == 'passed' else '⚠'} Found {len(vulnerabilities)} vulnerabilities")

        except Exception as e:
            print(f"   ✗ Error scanning dependencies: {e}")
            self.results["summary"]["failed"] += 1

    def scan_javascript_dependencies(self):
        """Scansiona dipendenze JavaScript per vulnerabilità."""
        print("🔍 Scanning JavaScript dependencies...")

        result = self.run_command(
            ["npm", "audit", "--json"],
            cwd=self.repo_root / "frontend",
        )

        try:
            audit_data = json.loads(result.stdout)
            vulnerabilities = audit_data.get("metadata", {}).get("vulnerabilities", {})

            total_vulns = sum(vulnerabilities.values())
            status = "passed" if total_vulns == 0 else "failed"

            self.results["tests"].append(
                {
                    "name": "JavaScript Dependency Scan",
                    "type": "dependency_scan",
                    "status": status,
                    "vulnerabilities": vulnerabilities,
                }
            )

            if status == "passed":
                self.results["summary"]["passed"] += 1
            else:
                self.results["summary"]["warnings"] += 1

            print(f"   {'✓' if status == 'passed' else '⚠'} Found {total_vulns} vulnerabilities")

        except Exception as e:
            print(f"   ✗ Error scanning JS dependencies: {e}")
            self.results["summary"]["failed"] += 1

    def run_bandit_scan(self):
        """Esegue Bandit per analisi statica Python."""
        print("🛡️ Running Bandit security scan...")

        report_path = self.repo_root / "bandit-report.json"
        result = self.run_command(
            ["bandit", "-r", "backend/app", "-f", "json", "-o", str(report_path)],
            cwd=self.repo_root,
        )

        try:
            with open(report_path) as f:
                bandit_data = json.load(f)

            issues = bandit_data.get("results", [])
            high_severity = [i for i in issues if i.get("issue_severity") == "HIGH"]

            status = "passed" if len(high_severity) == 0 else "failed"

            self.results["tests"].append(
                {
                    "name": "Bandit Static Analysis",
                    "type": "static_analysis",
                    "status": status,
                    "total_issues": len(issues),
                    "high_severity": len(high_severity),
                }
            )

            if len(issues) == 0:
                self.results["summary"]["passed"] += 1
            elif len(high_severity) == 0:
                self.results["summary"]["warnings"] += 1
            else:
                self.results["summary"]["failed"] += 1

            print(
                f"   {'✓' if status == 'passed' else '⚠'} "
                f"Found {len(issues)} issues ({len(high_severity)} high severity)"
            )

        except Exception as e:
            print(f"   ✗ Error running Bandit: {e}")
            self.results["summary"]["failed"] += 1

    def run_security_tests(self):
        """Esegue test di sicurezza specifici."""
        print("🔐 Running security tests...")

        result = self.run_command(
            ["pytest", "backend/tests/security/", "-v"],
            cwd=self.repo_root,
        )

        status = "passed" if result.returncode == 0 else "failed"

        self.results["tests"].append(
            {
                "name": "Security Tests",
                "type": "security_tests",
                "status": status,
                "output": result.stdout,
            }
        )

        if status == "passed":
            self.results["summary"]["passed"] += 1
        else:
            self.results["summary"]["failed"] += 1

        print(f"   {'✓' if status == 'passed' else '✗'} Security tests {status}")

    def generate_report(self):
        """Genera report finale."""
        self.results["summary"]["total"] = (
            self.results["summary"]["passed"]
            + self.results["summary"]["failed"]
            + self.results["summary"]["warnings"]
        )

        report_file = (
            self.repo_root
            / f"security-report-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
        )

        with open(report_file, "w") as f:
            json.dump(self.results, f, indent=2)

        print("\n" + "=" * 60)
        print("📊 SECURITY SCAN SUMMARY")
        print("=" * 60)
        print(f"Total tests: {self.results['summary']['total']}")
        print(f"✓ Passed:   {self.results['summary']['passed']}")
        print(f"⚠ Warnings: {self.results['summary']['warnings']}")
        print(f"✗ Failed:   {self.results['summary']['failed']}")
        print(f"\nReport saved: {report_file}")
        print("=" * 60)

        return self.results["summary"]["failed"] == 0

    def run_all(self):
        """Esegue tutti i test."""
        print("\n🤖 Starting Security Bot...\n")

        self.run_unit_tests()
        self.scan_python_dependencies()
        self.scan_javascript_dependencies()
        self.run_bandit_scan()
        self.run_security_tests()

        success = self.generate_report()

        if not success:
            print("\n⚠️ ATTENZIONE: Vulnerabilità critiche rilevate!")
            sys.exit(1)
        else:
            print("\n✓ Tutti i test di sicurezza passati!")
            sys.exit(0)


if __name__ == "__main__":
    bot = SecurityBot()
    bot.run_all()
