"""
Evacuation Decision-Support & Safe Routing Engine
Calculates village evacuation priorities, shelter allocations, and bridge inundation risks.
"""

from typing import List, Dict, Any
from backend.app.core.data_fixtures import EVACUATION_SHELTERS
from backend.app.services.iot_simulator import iot_simulator

class EvacuationEngine:
    def __init__(self):
        self.shelters = [dict(s) for s in EVACUATION_SHELTERS]

    def get_evacuation_plan(self) -> Dict[str, Any]:
        """
        Generates a live decision-support evacuation dashboard.
        """
        villages = iot_simulator.village_states
        priority_queue = []
        total_people_at_risk = 0
        total_evacuated_est = 0

        # Critical Infrastructure & Road/Bridge Vulnerabilities
        bridges_status = [
            {
                "id": "BRG_01",
                "name": "Manali Old Iron Bridge",
                "nearest_village": "VIL_001",
                "clearance_m": 4.5,
                "status": "PASSABLE" if villages.get("VIL_001", {}).get("prediction", {}).get("risk_level") != "CRITICAL" else "SUBMERGED_CLOSED"
            },
            {
                "id": "BRG_02",
                "name": "Bhuntar Beas Confluence Bridge",
                "nearest_village": "VIL_002",
                "clearance_m": 5.0,
                "status": "PASSABLE" if villages.get("VIL_002", {}).get("prediction", {}).get("risk_level") not in ["HIGH", "CRITICAL"] else "RESTRICTED_DANGER"
            },
            {
                "id": "BRG_03",
                "name": "Mandi Historic Victoria Suspension Bridge",
                "nearest_village": "VIL_006",
                "clearance_m": 5.8,
                "status": "PASSABLE" if villages.get("VIL_006", {}).get("prediction", {}).get("risk_level") != "CRITICAL" else "STRUCTURAL_ALERT_CLOSED"
            },
            {
                "id": "BRG_04",
                "name": "Aut Tunnel NH-21 Low-lying Causeway",
                "nearest_village": "VIL_004",
                "clearance_m": 6.2,
                "status": "PASSABLE" if villages.get("VIL_004", {}).get("prediction", {}).get("risk_level") not in ["HIGH", "CRITICAL"] else "FLOODED_CLOSED"
            }
        ]

        for v_id, v_data in villages.items():
            pred = v_data.get("prediction", {})
            risk_score = pred.get("risk_score", 10.0)
            risk_level = pred.get("risk_level", "LOW")
            lead_time = max(0.5, pred.get("lead_time_hrs", 12.0))
            pop = v_data.get("population", 5000)

            # Evacuation Priority Formula
            # Priority Index = (Risk_Score^1.5 * Population) / (Lead_Time_Hours * 1000)
            priority_score = round(((risk_score ** 1.4) * pop) / (lead_time * 1200.0), 1)

            # Find designated shelter
            matched_shelter = next((s for s in self.shelters if s["village_id"] == v_id), self.shelters[0])

            # Estimated vulnerable people requiring immediate evacuation
            if risk_level == "CRITICAL":
                vulnerable_pop = int(pop * 0.70)
                urgency = "IMMEDIATE_EVACUATION"
            elif risk_level == "HIGH":
                vulnerable_pop = int(pop * 0.35)
                urgency = "HIGH_PRIORITY_RELOCATION"
            elif risk_level == "MODERATE":
                vulnerable_pop = int(pop * 0.10)
                urgency = "STAGE_1_ADVISORY"
            else:
                vulnerable_pop = 0
                urgency = "MONITORING_STANDBY"

            total_people_at_risk += vulnerable_pop

            priority_queue.append({
                "village_id": v_id,
                "village_name": v_data.get("name"),
                "district": v_data.get("district"),
                "population": pop,
                "vulnerable_population": vulnerable_pop,
                "risk_score": risk_score,
                "risk_level": risk_level,
                "lead_time_hrs": lead_time,
                "priority_score": priority_score,
                "urgency": urgency,
                "shelter_id": matched_shelter["id"],
                "shelter_name": matched_shelter["name"],
                "shelter_capacity": matched_shelter["capacity_people"],
                "shelter_elevation_m": matched_shelter["elevation_m"],
                "medical_post": matched_shelter["medical_post"],
                "safe_route_notes": f"Ascend via {matched_shelter['name']} ridge corridor avoiding riverbank roads."
            })

        # Sort priority queue descending
        priority_queue.sort(key=lambda x: x["priority_score"], reverse=True)

        # NDRF Deployment & Relief Resources Estimate
        ndrf_teams_needed = max(1, int(total_people_at_risk / 2000)) if total_people_at_risk > 0 else 0
        rescue_boats_needed = max(2, int(total_people_at_risk / 1500)) if total_people_at_risk > 0 else 0

        return {
            "total_vulnerable_population": total_people_at_risk,
            "ndrf_teams_deployed_estimate": ndrf_teams_needed,
            "inflatable_rescue_boats_needed": rescue_boats_needed,
            "priority_queue": priority_queue,
            "shelters": self.shelters,
            "bridges_infrastructure": bridges_status
        }

# Global singleton
evacuation_engine = EvacuationEngine()
