import unittest
import sys
import os

backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from services.village_service import get_villages_by_district, get_village, get_village_coordinates
from services.feature_service import get_village_features
from services.prediction_service import predict_village_risk

class TestVillageService(unittest.TestCase):

    def test_get_villages_kullu(self):
        villages = get_villages_by_district("Himachal Pradesh", "Kullu")
        self.assertIsInstance(villages, list)
        self.assertGreater(len(villages), 0, "Kullu should return real villages from Overpass API / Disk cache")
        
        v = villages[0]
        self.assertIn("village_name", v)
        self.assertIn("village_code", v)
        self.assertIn("latitude", v)
        self.assertIn("longitude", v)
        self.assertEqual(v["precision_label"], "Village-location based risk assessment")

    def test_get_village_by_code(self):
        villages = get_villages_by_district("Himachal Pradesh", "Kullu")
        if villages:
            v_code = villages[0]["village_code"]
            v = get_village("Himachal Pradesh", "Kullu", v_code)
            self.assertIsNotNone(v)
            self.assertEqual(v["village_code"], v_code)

    def test_predict_village_risk(self):
        villages = get_villages_by_district("Himachal Pradesh", "Kullu")
        if villages:
            v_name = villages[0]["village_name"]
            res = predict_village_risk("Himachal Pradesh", "Kullu", v_name)
            self.assertIn("location", res)
            self.assertIn("prediction", res)
            self.assertIn("provenance", res)
            self.assertEqual(res["provenance"]["precision_label"], "Village-location based risk assessment")

if __name__ == "__main__":
    unittest.main()
