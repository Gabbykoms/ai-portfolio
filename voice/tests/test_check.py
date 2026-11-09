import unittest

from voice.check import compare, wer


class TranscriptTests(unittest.TestCase):
    def test_perfect_spacing_case(self):
        self.assertEqual(wer('Gabriel Koomson studies CPSC 415', '  GABRIEL  Koomson studies cpsc 415!'), 0)

    def test_one_substitution_in_thirteen(self):
        self.assertAlmostEqual(wer('one two three four five six seven eight nine ten eleven twelve thirteen',
                                   'one two three four five six seven eight nine ten eleven twelve wrong'), 1 / 13)

    def test_insertions_and_deletions(self):
        self.assertEqual(wer('one two', 'one extra two'), 0.5)
        self.assertEqual(wer('one two', 'one'), 0.5)

    def test_empty_is_failure(self):
        for transcript in (None, '', '  ', '!!!'):
            result = compare('hello', transcript)
            self.assertFalse(result['ok'])
            self.assertTrue(result['empty'])
            self.assertEqual(result['wer'], 1)

    def test_missing_name_despite_low_error(self):
        result = compare('Gabriel built a project with many useful features for students on campus',
                         'Daniel built a project with many useful features for students on campus', ['Gabriel'])
        self.assertLess(result['wer'], 0.15)
        self.assertEqual(result['missing'], ['Gabriel'])
        self.assertFalse(result['ok'])

    def test_number_words_do_not_match_digits(self):
        self.assertFalse(compare('CPSC 415', 'CPSC four fifteen', ['415'])['ok'])

    def test_required_phrase_boundaries(self):
        self.assertEqual(compare('Jo', 'John', ['Jo'])['missing'], ['Jo'])
        self.assertTrue(compare('Gabriel Koomson', 'GABRIEL   KOOMSON', ['Gabriel Koomson'])['ok'])

    def test_insertions_can_exceed_one(self):
        self.assertEqual(wer('one', 'one two three four'), 3)


if __name__ == '__main__':
    unittest.main()
