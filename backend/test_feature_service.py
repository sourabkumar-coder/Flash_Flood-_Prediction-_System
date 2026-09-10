from services.feature_service import build_features


print("=" * 70)
print("MULTI-SOURCE FEATURE TEST")
print("=" * 70)

state = "Himachal Pradesh"
district = "Kullu"

result = build_features(
    state,
    district
)

print("\n" + "=" * 70)
print("FINAL FEATURE VECTOR")
print("=" * 70)

for name, value in result["features"].items():
    print(f"{name:35} : {value}")