import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('importer',Path(__file__).resolve().parents[1]/'scripts'/'update_data.py')
module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)

class ImporterTests(unittest.TestCase):
    def grid_html(self, notes=''):
        return '<main><table><tr><th>Pos.</th><th>No.</th><th>Driver</th><th>Team</th></tr><tr><td>1</td><td>63</td><td>George Russell</td><td>Mercedes</td></tr><tr><td>2</td><td>14</td><td>Fernando Alonso</td><td>Aston Martin</td></tr><tr><td>3</td><td>30</td><td>Liam Lawson</td><td>Red Bull Racing</td></tr></table><p>Note - '+notes+'</p></main>'

    def test_pit_lane_notes_and_penalties_are_distinct(self):
        grid=module.starting_grid(self.grid_html('Russell penalised 60 places for use of additional power unit elements. Alonso and Lawson required to start from the pit lane after cars were modified.'))
        self.assertEqual(grid['pitLaneNumbers'], ['14','30'])
        self.assertEqual(grid['results']['rows'][0][1], '63')

    def test_no_grid_does_not_become_a_qualifying_grid(self):
        self.assertIsNone(module.starting_grid('<table><tr><th>Pos.</th><th>No.</th><th>Driver</th><th>Team</th></tr><tr><td>Error</td><td>No results available</td></tr></table>'))
        self.assertIsNone(module.starting_grid('<p>No results available</p>'))

    def test_grid_without_penalty_notes(self):
        self.assertEqual(module.starting_grid(self.grid_html())['pitLaneNumbers'], [])

    def test_pit_lane_continuation_refers_to_one_named_driver(self):
        notes='Alonso granted permission to race after being disqualified. Required to start from the pit lane after car changes.'
        self.assertEqual(module.starting_grid(self.grid_html(notes))['pitLaneNumbers'], ['14'])

    def test_driver_name_omits_duplicate_mobile_code(self):
        source='<table><tr><th>Driver</th></tr><tr><td><span class="max-lg:hidden">Fernando</span>&nbsp;<span class="max-md:hidden">Alonso</span><span class="md:hidden">ALO</span></td></tr></table>'
        self.assertEqual(module.table(source)['rows'],[['Fernando Alonso']])
    def test_unpublished_results_are_not_fabricated(self):
        self.assertIsNone(module.table('<p>No results yet</p>'))
        self.assertIsNone(module.table('<table><tr><th>Driver</th></tr></table>'))

if __name__=='__main__': unittest.main()
