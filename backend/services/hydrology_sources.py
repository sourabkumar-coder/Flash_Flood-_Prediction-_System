from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATA_DIR = PROJECT_ROOT / "data" / "raw"


HYDROLOGY_SOURCES = {
    "discharge": [
        {
            "name": "Himachal Pradesh River Discharge Telemetry",
            "state": "Himachal Pradesh",
            "file": DATA_DIR
            / "river_discharge_tele_hr_himachal_pradesh_hp_2026_2030.csv",
            "type": "csv",
            "available": True,
        }
    ],

    "water_level": [
        {
            "name": "Manipur River Water Level Telemetry",
            "state": "Manipur",
            "file": DATA_DIR
            / "river_water_level_telemetry_manipur_2026_2030.csv",
            "type": "csv",
            "available": True,
        }
    ],
}


def get_sources(source_type):
    """
    Return all registered sources of a given type.
    """

    return HYDROLOGY_SOURCES.get(
        source_type,
        []
    )


def get_sources_for_state(source_type, state_name):
    """
    Return registered sources available for a state.
    """

    if not state_name:
        return []

    requested_state = state_name.strip().casefold()

    sources = get_sources(source_type)

    return [
        source
        for source in sources
        if source["state"].strip().casefold()
        == requested_state
    ]


def get_available_sources(source_type, state_name=None):
    """
    Return sources whose files are actually available.
    """

    sources = get_sources(
        source_type
    )

    if state_name:
        sources = [
            source
            for source in sources
            if source["state"].strip().casefold()
            == state_name.strip().casefold()
        ]

    return [
        source
        for source in sources
        if source["available"]
        and source["file"].exists()
    ]