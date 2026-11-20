"""Test puri: nessun database e nessun movimento ERP."""
import unittest
from services.firenze_navigation import TARGETS, navigation_data, validate_targets

class FirenzeNavigationTests(unittest.TestCase):
    def test_all_preparatory_steps_are_mapped(self):
        self.assertTrue(validate_targets())
        self.assertEqual(len(TARGETS), 12)

    def test_cannot_enable_grading_or_posting(self):
        data = navigation_data()
        self.assertFalse(data['source_verified'])
        self.assertFalse(data['assessment_enabled'])
        self.assertFalse(data['posting_enabled'])
        self.assertTrue(all(s['status'].startswith('COLLEGAMENTO_PREPARATORIO') for s in data['steps']))

    def test_no_write_endpoint(self):
        self.assertTrue(all('.' in endpoint for endpoint, _ in TARGETS.values()))
        self.assertEqual(TARGETS['PREP-09'][0], 'costs.report')

if __name__ == '__main__': unittest.main()
