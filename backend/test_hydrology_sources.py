from services.hydrology_sources import (
    get_available_sources
)


print("=" * 60)
print("HYDROLOGY SOURCE REGISTRY TEST")
print("=" * 60)


print("\nHimachal Pradesh - Discharge:")

sources = get_available_sources(
    "discharge",
    "Himachal Pradesh"
)

for source in sources:
    print(
        "Name:",
        source["name"]
    )

    print(
        "File:",
        source["file"]
    )

    print(
        "Available:",
        source["available"]
    )


print("\nHimachal Pradesh - Water Level:")

sources = get_available_sources(
    "water_level",
    "Himachal Pradesh"
)

for source in sources:
    print(
        "Name:",
        source["name"]
    )

    print(
        "File:",
        source["file"]
    )

    print(
        "Available:",
        source["available"]
    )


print("\nManipur - Water Level:")

sources = get_available_sources(
    "water_level",
    "Manipur"
)

for source in sources:
    print(
        "Name:",
        source["name"]
    )

    print(
        "File:",
        source["file"]
    )

    print(
        "Available:",
        source["available"]
    )