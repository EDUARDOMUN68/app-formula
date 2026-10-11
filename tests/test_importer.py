import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('importer',Path(__file__).resolve().parents[1]/'scripts'/'update_data.py')
module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)

class ImporterTests(unittest.TestCase):
    def test_driver_name_omits_duplicate_mobile_code(self):
        source='<table><tr><th>Driver</th></tr><tr><td><span class="max-lg:hidden">Fernando</span>&nbsp;<span class="max-md:hidden">Alonso</span><span class="md:hidden">ALO</span></td></tr></table>'
        self.assertEqual(module.table(source)['rows'],[['Fernando Alonso']])
    def test_unpublished_results_are_not_fabricated(self):
        self.assertIsNone(module.table('<p>No results yet</p>'))
        self.assertIsNone(module.table('<table><tr><th>Driver</th></tr></table>'))

if __name__=='__main__': unittest.main()
