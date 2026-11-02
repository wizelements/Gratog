"""Unit failure injection for reporting; does not execute a database restore."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[2] / 'scripts/release/verify-staging-restore.py'
SPEC = importlib.util.spec_from_file_location('restore_drill', SCRIPT)
DRILL = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(DRILL)


class RestoreReportTests(unittest.TestCase):
    def run_drill(self, integrity_results=None, destroy_fails=False):
        state = {'canary': False}

        def cli(*args):
            if args[0] == 'destroy' and destroy_fails:
                raise RuntimeError('CLONE_CLEANUP_FAILED')
            if args[0] == 'shell' and 'INSERT INTO' in args[2]:
                state['canary'] = True
            return ''

        def scalar(database, statement):
            if 'opee_isolated_restore_canary' in statement:
                return int(database == DRILL.CLONE and state['canary'])
            return 20

        previous = Path.cwd()
        with tempfile.TemporaryDirectory() as directory:
            try:
                os.chdir(directory)
                with patch.object(DRILL, 'cli', side_effect=cli), \
                     patch.object(DRILL, 'scalar', side_effect=scalar), \
                     patch.object(DRILL, 'integrity', side_effect=integrity_results or [None, None]), \
                     contextlib.redirect_stdout(io.StringIO()):
                    error = None
                    try:
                        DRILL.main()
                    except RuntimeError as caught:
                        error = caught
                report = json.loads(Path('test-results/turso-staging-restore-drill.json').read_text())
                return report, error
            finally:
                os.chdir(previous)

    def test_complete_drill_reports_pass(self):
        report, error = self.run_drill()
        self.assertIsNone(error)
        self.assertTrue(report['passed'])

    def test_final_integrity_failure_never_reports_pass(self):
        report, error = self.run_drill([None, RuntimeError('RESTORED_CLONE_INTEGRITY_FAILED')])
        self.assertIsNotNone(error)
        self.assertFalse(report['passed'])
        self.assertFalse(report['finalIntegrityVerified'])
        self.assertTrue(report['cloneDestroyed'])

    def test_initial_integrity_failure_never_reports_pass(self):
        report, error = self.run_drill([RuntimeError('RESTORED_CLONE_INTEGRITY_FAILED')])
        self.assertIsNotNone(error)
        self.assertFalse(report['passed'])
        self.assertTrue(report['cloneDestroyed'])

    def test_cleanup_failure_never_reports_pass(self):
        report, error = self.run_drill(destroy_fails=True)
        self.assertIsNotNone(error)
        self.assertFalse(report['passed'])
        self.assertFalse(report['cloneDestroyed'])


if __name__ == '__main__':
    unittest.main()
